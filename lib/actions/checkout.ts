"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CreateOrderSchema, CheckoutError } from "@/lib/validations/checkout";
import type { CreateOrderInput, OrderResult } from "@/lib/validations/checkout";
import { calculateShippingCost, calculatePlatformFee, calculateTotal, calculateSellerPayout } from "@/lib/utils/pricing";
import { SELLER_CONFIRM_TIMEOUT_MS } from "@/lib/config/shipping-rates";
import type { EscrowStatus } from "@prisma/client";

// ─── Create Order (Checkout Wizard) ──────────────────────────────────────────
//
// Entry point for the new multi-step checkout.
// Extends the existing EscrowOrder model with delivery/payment fields.
//
// Race condition prevention:
//   - Serializable transaction re-reads item + wallet inside the lock
//   - Second concurrent buyer sees "สินค้านี้ถูกขายไปแล้ว"

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  // ──────────────────────────────────────
  // 1. AUTH
  // ──────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "กรุณาเข้าสู่ระบบ" };
  }
  const buyerId = session.user.id;

  // ──────────────────────────────────────
  // 2. VALIDATE INPUT
  // ──────────────────────────────────────
  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "ข้อมูลไม่ถูกต้อง", details: parsed.error };
  }
  const data = parsed.data;

  // Extra: COD requires risk acceptance
  if (data.paymentMethod === "COD" && !data.codRiskAccepted) {
    return { success: false, error: "กรุณายอมรับเงื่อนไขการจ่ายเงินสด" };
  }

  // Meetup datetime validation
  if (data.deliveryMethod === "MEETUP" && data.meetupDateTime) {
    const meetupDate = new Date(data.meetupDateTime);
    const now = new Date();
    if (meetupDate <= now) {
      return { success: false, error: "กรุณาเลือกเวลานัดรับใหม่ (ต้องเป็นเวลาในอนาคต)" };
    }
    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (meetupDate > maxDate) {
      return { success: false, error: "กรุณาเลือกวันเวลานัดรับภายใน 7 วัน" };
    }
  }

  // ──────────────────────────────────────
  // 3. TRANSACTIONAL ORDER CREATION
  // ──────────────────────────────────────
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-read item inside the transaction for consistency
      const [item, existingOrder] = await Promise.all([
        tx.item.findUnique({
          where: { id: data.itemId },
          select: {
            id: true, price: true, status: true, sellerId: true, title: true,
            allowShipping: true, allowMeetup: true, allowCOD: true,
          },
        }),
        tx.escrowOrder.findFirst({
          where: {
            itemId: data.itemId,
            status: { in: ["FUNDS_HELD", "SHIPPED", "PENDING_CONFIRMATION", "AWAITING_SHIPMENT", "MEETUP_SCHEDULED", "MEETUP_ARRANGED"] },
          },
          select: { id: true },
        }),
      ]);

      // Validate item is still available
      if (!item) throw new CheckoutError("ไม่พบสินค้า");
      if (item.status !== "APPROVED") throw new CheckoutError("สินค้านี้ถูกขายไปแล้ว");
      if (item.sellerId === buyerId) throw new CheckoutError("ไม่สามารถซื้อสินค้าของตัวเองได้");
      if (existingOrder) throw new CheckoutError("สินค้านี้มีคำสั่งซื้อที่กำลังดำเนินการอยู่");

      // Validate delivery method is allowed
      if (data.deliveryMethod === "SHIPPING" && !item.allowShipping) {
        throw new CheckoutError("สินค้านี้ไม่รองรับการจัดส่ง");
      }
      if (data.deliveryMethod === "MEETUP" && !item.allowMeetup) {
        throw new CheckoutError("สินค้านี้ไม่รองรับการนัดรับ");
      }

      // Validate payment method is allowed
      if (data.paymentMethod === "COD" && !item.allowCOD) {
        throw new CheckoutError("สินค้านี้ไม่รองรับการจ่ายเงินสด");
      }

      // ──────────────────────────────────────
      // 4. CALCULATE PRICING
      // ──────────────────────────────────────
      const itemPrice = item.price;
      const shippingCost = calculateShippingCost(data.deliveryMethod);
      const platformFee = calculatePlatformFee(itemPrice, data.paymentMethod);
      const totalAmount = calculateTotal(itemPrice, shippingCost, platformFee);
      const sellerPayout = calculateSellerPayout(totalAmount, platformFee);

      // ──────────────────────────────────────
      // 5. HANDLE PAYMENT (if Escrow)
      // ──────────────────────────────────────
      if (data.paymentMethod === "ESCROW") {
        const buyer = await tx.user.findUniqueOrThrow({
          where: { id: buyerId },
          select: { walletBalance: true },
        });

        if (buyer.walletBalance < totalAmount) {
          throw new CheckoutError(
            `ยอดเงินไม่เพียงพอ (ต้องการ ฿${totalAmount.toFixed(2)}, มี ฿${buyer.walletBalance.toFixed(2)})`
          );
        }

        // Deduct from buyer's wallet
        await tx.user.update({
          where: { id: buyerId },
          data: { walletBalance: { decrement: totalAmount } },
        });

        // Credit seller's escrow balance (visible but not spendable)
        await tx.user.update({
          where: { id: item.sellerId },
          data: { escrowBalance: { increment: totalAmount } },
        });
      }

      // ──────────────────────────────────────
      // 6. DETERMINE INITIAL STATUS
      // ──────────────────────────────────────
      let initialStatus: EscrowStatus;
      if (data.paymentMethod === "ESCROW") {
        initialStatus = data.deliveryMethod === "SHIPPING"
          ? "FUNDS_HELD"
          : "MEETUP_SCHEDULED";
      } else {
        // COD
        initialStatus = data.deliveryMethod === "SHIPPING"
          ? "AWAITING_SHIPMENT"
          : "MEETUP_ARRANGED";
      }

      // ──────────────────────────────────────
      // 7. CREATE ESCROW ORDER (extended)
      // ──────────────────────────────────────
      const expiresAt = new Date(Date.now() + SELLER_CONFIRM_TIMEOUT_MS);

      const order = await tx.escrowOrder.create({
        data: {
          buyerId,
          sellerId: item.sellerId,
          itemId: item.id,
          amount: itemPrice,
          status: initialStatus,

          // Checkout wizard fields
          deliveryMethod: data.deliveryMethod,
          paymentMethod: data.paymentMethod,
          shippingAddress: data.deliveryMethod === "SHIPPING" ? (data.shippingAddress as object) : undefined,
          meetupLocation: data.deliveryMethod === "MEETUP" ? data.meetupLocation : undefined,
          meetupDateTime: data.deliveryMethod === "MEETUP" && data.meetupDateTime
            ? new Date(data.meetupDateTime) : undefined,
          meetupNote: data.deliveryMethod === "MEETUP" ? (data.meetupNote ?? undefined) : undefined,

          // Financial
          platformFee,
          shippingCost,
          totalAmount,
          sellerPayout,

          // Status tracking
          expiresAt,
          statusHistory: [
            {
              status: initialStatus,
              changedAt: new Date().toISOString(),
              changedBy: buyerId,
              note: "สร้างคำสั่งซื้อ",
            },
          ],
        },
      });

      // ──────────────────────────────────────
      // 8. UPDATE ITEM STATUS
      // ──────────────────────────────────────
      await tx.item.update({
        where: { id: item.id },
        data: { status: "SOLD" },
      });

      // ──────────────────────────────────────
      // 9. SAVE ADDRESS (if requested)
      // ──────────────────────────────────────
      if (data.deliveryMethod === "SHIPPING" && data.saveAddress && data.shippingAddress) {
        const addr = data.shippingAddress;
        await tx.savedAddress.create({
          data: {
            userId: buyerId,
            label: "ที่อยู่ใหม่",
            recipientName: addr.recipientName,
            phone: addr.phone,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            district: addr.district,
            province: addr.province,
            postalCode: addr.postalCode,
            note: addr.note,
          },
        });
      }

      // ──────────────────────────────────────
      // 10. NOTIFY SELLER
      // ──────────────────────────────────────
      const deliveryLabel = data.deliveryMethod === "SHIPPING" ? "จัดส่ง" : "นัดรับ";
      const paymentLabel = data.paymentMethod === "ESCROW" ? "Escrow" : "เงินสด";

      await tx.notification.create({
        data: {
          userId: item.sellerId,
          type: "ORDER",
          message: `🛒 คำสั่งซื้อใหม่: "${item.title}" — ${deliveryLabel} / ${paymentLabel} ฿${totalAmount.toLocaleString()}`,
          link: "/dashboard/orders",
        },
      });

      return order;
    });

    // ──────────────────────────────────────
    // POST-TRANSACTION SIDE EFFECTS
    // ──────────────────────────────────────
    revalidatePath("/");
    revalidatePath("/dashboard/orders");

    return {
      success: true,
      orderId: result.id,
      message: "สร้างคำสั่งซื้อเรียบร้อยแล้ว",
    };

  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, error: error.message };
    }
    console.error("Checkout failed:", error);
    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}
