"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRUST_FLOOR   = 0;
const TRUST_CEILING = 200;

const BUYER_TRUST_REWARD  = 2;  // buyer earns this for completing a transaction
const SELLER_TRUST_REWARD = 5;  // seller earns this on successful delivery

function clamp(n: number) {
  return Math.max(TRUST_FLOOR, Math.min(TRUST_CEILING, n));
}

// ─── Initiate Purchase ────────────────────────────────────────────────────────
//
// THE ENTRY POINT. Called by the buyer clicking "Buy Now".
//
// Safety guarantees (all inside one interactive $transaction):
//   1. Item re-read inside the lock — prevents a second buyer sneaking through
//      in the window between the pre-check and the write.
//   2. Buyer balance re-read inside the lock — prevents double-spend if the
//      user somehow fires two concurrent requests.
//   3. Any failure rolls back all writes atomically; buyer's wallet is intact.

export async function initiatePurchase(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const buyerId = session.user.id;

  // ── Optimistic pre-checks (outside tx, cheaper) ───────────────────────────
  const item = await prisma.item.findUnique({
    where:  { id: itemId },
    select: { id: true, price: true, status: true, sellerId: true, title: true },
  });

  if (!item)                        return { error: "Item not found" };
  if (item.status !== "APPROVED")   return { error: "Item is not available for purchase" };
  if (item.sellerId === buyerId)    return { error: "You cannot buy your own item" };

  const amount = item.price;

  // ── Atomic money movement ─────────────────────────────────────────────────
  try {
    const order = await prisma.$transaction(async (tx) => {
      // Re-read both buyer and item inside the lock to prevent races
      const [buyer, lockedItem, existingOrder] = await Promise.all([
        tx.user.findUniqueOrThrow({
          where:  { id: buyerId },
          select: { walletBalance: true },
        }),
        tx.item.findUniqueOrThrow({
          where:  { id: itemId },
          select: { status: true },
        }),
        tx.escrowOrder.findFirst({
          where: {
            itemId,
            status: { in: ["FUNDS_HELD", "SHIPPED"] },
          },
          select: { id: true },
        }),
      ]);

      // Business-rule assertions inside the lock
      if (lockedItem.status !== "APPROVED") {
        throw new Error("Item was purchased by someone else just now");
      }
      if (existingOrder) {
        throw new Error("An active order already exists for this item");
      }
      if (buyer.walletBalance < amount) {
        throw new Error(
          `Insufficient balance. You have ฿${buyer.walletBalance.toLocaleString()} but need ฿${amount.toLocaleString()}`
        );
      }

      // Create the escrow order
      const newOrder = await tx.escrowOrder.create({
        data: {
          itemId,
          buyerId,
          sellerId: item.sellerId,
          amount,
          status:   "FUNDS_HELD",
        },
      });

      await Promise.all([
        // Deduct from buyer's wallet
        tx.user.update({
          where: { id: buyerId },
          data:  { walletBalance: { decrement: amount } },
        }),
        // Credit seller's escrow balance (visible but not spendable yet)
        tx.user.update({
          where: { id: item.sellerId },
          data:  { escrowBalance: { increment: amount } },
        }),
        // Lock the item so no one else can buy it
        tx.item.update({
          where: { id: itemId },
          data:  { status: "SOLD" },
        }),
        // Notify the seller
        tx.notification.create({
          data: {
            userId:  item.sellerId,
            type:    "ORDER",
            message: `🛒 "${item.title}" ถูกซื้อแล้ว! ฿${amount.toLocaleString()} ถูกล็อคในระบบ Escrow รอคุณจัดส่ง`,
            link:    "/dashboard/orders",
          },
        }),
      ]);

      return newOrder;
    });

    revalidatePath("/");
    revalidatePath("/dashboard/orders");
    return { success: true, orderId: order.id };

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Purchase failed";
    return { error: msg };
  }
}

// ─── Cancel Order (Pre-Shipment) ─────────────────────────────────────────────
//
// Either buyer or seller may cancel while the order is still FUNDS_HELD.
// Money is automatically returned to the buyer; the item goes back to APPROVED
// so it re-appears on the marketplace without needing admin re-approval.

export async function cancelOrder(orderId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const callerId    = session.user.id;
  const trimReason  = reason.trim();
  if (!trimReason) return { error: "กรุณาระบุเหตุผลในการยกเลิก" };

  const order = await prisma.escrowOrder.findUnique({
    where:  { id: orderId },
    select: {
      id: true, status: true, amount: true,
      buyerId: true, sellerId: true, itemId: true,
      item: { select: { title: true } },
    },
  });

  if (!order) return { error: "Order not found" };

  const isBuyer  = order.buyerId  === callerId;
  const isSeller = order.sellerId === callerId;
  if (!isBuyer && !isSeller) return { error: "Not authorized" };

  if (order.status !== "FUNDS_HELD") {
    return { error: `ไม่สามารถยกเลิกได้ — สถานะปัจจุบัน: ${order.status}` };
  }

  const otherId   = isBuyer ? order.sellerId : order.buyerId;
  const roleLabel = isBuyer ? "ผู้ซื้อ" : "ผู้ขาย";

  try {
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        // Mark the order as CANCELLED
        tx.escrowOrder.update({
          where: { id: orderId },
          data:  { status: "CANCELLED", cancelReason: trimReason },
        }),
        // Refund buyer's wallet
        tx.user.update({
          where: { id: order.buyerId },
          data:  { walletBalance: { increment: order.amount } },
        }),
        // Clear seller's escrow balance
        tx.user.update({
          where: { id: order.sellerId },
          data:  { escrowBalance: { decrement: order.amount } },
        }),
        // Revert item back to APPROVED — visible on marketplace again
        tx.item.update({
          where: { id: order.itemId },
          data:  { status: "APPROVED" },
        }),
        // Notify the other party
        tx.notification.create({
          data: {
            userId:  otherId,
            type:    "ORDER",
            message: `❌ ${roleLabel}ยกเลิกคำสั่งซื้อ "${order.item.title}" — ฿${order.amount.toLocaleString()} คืนเข้ากระเป๋าผู้ซื้อแล้ว`,
            link:    "/dashboard/orders",
          },
        }),
        // Notify the cancelling party
        tx.notification.create({
          data: {
            userId:  callerId,
            type:    "ORDER",
            message: `✅ ยกเลิกคำสั่งซื้อ "${order.item.title}" เรียบร้อย${isBuyer ? ` — ฿${order.amount.toLocaleString()} คืนเข้ากระเป๋าแล้ว` : ""}`,
            link:    "/dashboard/orders",
          },
        }),
      ]);
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cancellation failed";
    return { error: msg };
  }
}

// ─── Confirm Shipment (Detailed) ──────────────────────────────────────────────
//
// Replaces the old markAsShipped. Seller provides shipping details which are
// stored on the order, and an automated message is sent into the buyer/seller
// chat so the buyer can track the parcel without asking the seller manually.
//
// The function finds (or creates) the existing conversation for the item and
// injects one system-style message from the seller.

export async function confirmShipment(
  orderId: string,
  details: {
    shippingMethod:     string;
    trackingNumber?:    string;
    shippingProofImage?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const sellerId = session.user.id;
  const { shippingMethod, trackingNumber, shippingProofImage } = details;

  if (!shippingMethod.trim()) return { error: "กรุณาระบุวิธีจัดส่ง" };

  const order = await prisma.escrowOrder.findUnique({
    where:  { id: orderId },
    select: {
      id: true, status: true, sellerId: true, buyerId: true, itemId: true,
      amount: true,
      item: { select: { title: true } },
    },
  });

  if (!order)                        return { error: "Order not found" };
  if (order.sellerId !== sellerId)   return { error: "Not authorized" };
  if (order.status !== "FUNDS_HELD") return { error: `Cannot ship — order status is ${order.status}` };

  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update order with shipping details
      await tx.escrowOrder.update({
        where: { id: orderId },
        data:  {
          status:             "SHIPPED",
          shippedAt:          now,
          shippingMethod:     shippingMethod.trim(),
          trackingNumber:     trackingNumber?.trim() || null,
          shippingProofImage: shippingProofImage || null,
        },
      });

      // 2. Find or create the conversation between seller and buyer for this item
      let conv = await tx.conversation.findFirst({
        where: {
          itemId: order.itemId,
          AND: [
            { members: { some: { id: order.buyerId  } } },
            { members: { some: { id: order.sellerId } } },
          ],
        },
        select: { id: true },
      });

      if (!conv) {
        conv = await tx.conversation.create({
          data: {
            itemId:  order.itemId,
            members: { connect: [{ id: order.buyerId }, { id: order.sellerId }] },
          },
          select: { id: true },
        });
      }

      // 3. Build the structured system message (machine-parseable shipping card)
      const METHOD_LABELS: Record<string, string> = {
        POST:    "ไปรษณีย์ไทย",
        KERRY:   "Kerry Express",
        FLASH:   "Flash Express",
        "J&T":   "J&T Express",
        MEETUP:  "นัดรับด้วยตนเอง",
      };
      const methodName = METHOD_LABELS[shippingMethod] ?? shippingMethod;

      const shippingPayload = JSON.stringify({
        orderId:        orderId,
        itemTitle:      order.item.title,
        amount:         order.amount,
        method:         shippingMethod.trim(),
        methodLabel:    methodName,
        trackingNumber: trackingNumber?.trim() || undefined,
        proofUrl:       shippingProofImage || undefined,
        shippedAt:      now.toISOString(),
      });

      // 4. Create the system-typed chat message
      await tx.message.create({
        data: {
          content:        `SYSTEM:SHIPPING:${shippingPayload}`,
          senderId:       order.sellerId,
          conversationId: conv.id,
        },
      });

      // 5. Push-notification to buyer
      await tx.notification.create({
        data: {
          userId:  order.buyerId,
          type:    "ORDER",
          message: `📦 "${order.item.title}" ถูกจัดส่งแล้ว — ${methodName}${trackingNumber ? ` (${trackingNumber})` : ""} กรุณายืนยันรับสินค้า`,
          link:    "/dashboard/orders",
        },
      });
    });

    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Shipment confirmation failed";
    return { error: msg };
  }
}

// ─── Mark as Shipped (legacy thin wrapper) ───────────────────────────────────
//
// Kept for backward compatibility. Delegates to confirmShipment with minimal
// details so existing callers are not broken.

export async function markAsShipped(orderId: string) {
  return confirmShipment(orderId, { shippingMethod: "OTHER" });
}

// ─── Confirm Receipt ──────────────────────────────────────────────────────────
//
// THE MOST CRITICAL FUNCTION. Buyer confirms they received the item.
//
// Money pipeline inside one atomic $transaction:
//   seller.escrowBalance  -= amount   (clears the "pending" funds)
//   seller.walletBalance  += amount   (seller can now spend/withdraw)
//   buyer.trustScore      += 2        (participation reward, clamped)
//   seller.trustScore     += 5        (successful delivery reward, clamped)
//
// This function is irreversible. Once called, money is released.

export async function confirmReceipt(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const buyerId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({
    where:   { id: orderId },
    select: {
      id:           true,
      status:       true,
      buyerId:      true,
      sellerId:     true,
      itemId:       true,
      amount:       true,
      sellerPayout: true,   // present for checkout-wizard orders; null for legacy
      totalAmount:  true,   // present for checkout-wizard orders; null for legacy
      item:         { select: { title: true } },
      buyer:        { select: { name: true } },
      seller:       { select: { name: true } },
    },
  });

  if (!order)                       return { error: "Order not found" };
  if (order.buyerId !== buyerId)    return { error: "Only the buyer can confirm receipt" };
  if (order.status !== "SHIPPED")   return { error: `Cannot confirm — order status is ${order.status}` };

  const completedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Read current scores inside the lock so clamp is accurate
      const [buyer, seller] = await Promise.all([
        tx.user.findUniqueOrThrow({
          where:  { id: buyerId },
          select: { trustScore: true },
        }),
        tx.user.findUniqueOrThrow({
          where:  { id: order.sellerId },
          select: { trustScore: true, escrowBalance: true },
        }),
      ]);

      // Find (or create) the shared conversation so we can post the receipt card
      let conv = await tx.conversation.findFirst({
        where: {
          itemId: order.itemId,
          AND: [
            { members: { some: { id: order.buyerId  } } },
            { members: { some: { id: order.sellerId } } },
          ],
        },
        select: { id: true },
      });
      if (!conv) {
        conv = await tx.conversation.create({
          data: {
            itemId:  order.itemId,
            members: { connect: [{ id: order.buyerId }, { id: order.sellerId }] },
          },
          select: { id: true },
        });
      }

      const receiptPayload = JSON.stringify({
        orderId:     orderId,
        itemTitle:   order.item.title,
        amount:      order.amount,
        completedAt: completedAt.toISOString(),
        buyerName:   order.buyer.name  ?? "ไม่ระบุ",
        sellerName:  order.seller.name ?? "ไม่ระบุ",
      });

      // For checkout-wizard orders sellerPayout / totalAmount are set.
      // For legacy orders (initiatePurchase) they're null — fall back to amount.
      const payout         = order.sellerPayout ?? order.amount;
      const escrowDecrement = order.totalAmount  ?? order.amount;

      await Promise.all([
        // Complete the order
        tx.escrowOrder.update({
          where: { id: orderId },
          data:  { status: "COMPLETED", completedAt: completedAt },
        }),
        // Release funds: clear the full held amount from escrow, credit sellerPayout to wallet
        tx.user.update({
          where: { id: order.sellerId },
          data:  {
            escrowBalance: Math.max(0, seller.escrowBalance - escrowDecrement),
            walletBalance: { increment: payout },
          },
        }),
        // Reward buyer trust (clamped)
        tx.user.update({
          where: { id: buyerId },
          data:  { trustScore: clamp(buyer.trustScore + BUYER_TRUST_REWARD) },
        }),
        // Reward seller trust (clamped)
        tx.user.update({
          where: { id: order.sellerId },
          data:  { trustScore: clamp(seller.trustScore + SELLER_TRUST_REWARD) },
        }),
        // Inject official receipt card into shared chat
        tx.message.create({
          data: {
            content:        `SYSTEM:RECEIPT:${receiptPayload}`,
            senderId:       order.buyerId,   // sent "as" buyer — system action
            conversationId: conv.id,
          },
        }),
        // Notify seller funds are released
        tx.notification.create({
          data: {
            userId:  order.sellerId,
            type:    "ORDER",
            message: `✅ ผู้ซื้อยืนยันรับสินค้า "${order.item.title}" แล้ว — ฿${payout.toLocaleString()} ถูกโอนเข้ากระเป๋าของคุณ`,
            link:    "/dashboard/orders",
          },
        }),
        // Notify buyer transaction complete
        tx.notification.create({
          data: {
            userId:  buyerId,
            type:    "ORDER",
            message: `🎉 ธุรกรรม "${order.item.title}" เสร็จสมบูรณ์ คะแนนความน่าเชื่อถือของคุณเพิ่มขึ้น!`,
            link:    "/dashboard/orders",
          },
        }),
      ]);
    });

    revalidatePath("/dashboard/orders");
    revalidatePath(`/user/${order.sellerId}`);
    return { success: true };

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not confirm receipt";
    return { error: msg };
  }
}

// ─── Raise Dispute ────────────────────────────────────────────────────────────
//
// Either party can freeze the order. No money moves.
// Admin must resolve via a separate resolveDispute() action (Phase 2).

export async function raiseDispute(orderId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "กรุณาระบุเหตุผลในการเปิดข้อพิพาท" };

  const callerId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({
    where:  { id: orderId },
    select: { id: true, status: true, buyerId: true, sellerId: true, item: { select: { title: true } } },
  });

  if (!order) return { error: "Order not found" };

  const isBuyer  = order.buyerId  === callerId;
  const isSeller = order.sellerId === callerId;
  if (!isBuyer && !isSeller) return { error: "Not authorized" };

  if (!["FUNDS_HELD", "SHIPPED"].includes(order.status)) {
    return { error: `Cannot dispute — order is already ${order.status}` };
  }

  const otherId = isBuyer ? order.sellerId : order.buyerId;
  const role    = isBuyer ? "ผู้ซื้อ" : "ผู้ขาย";

  await prisma.$transaction([
    prisma.escrowOrder.update({
      where: { id: orderId },
      data:  { status: "DISPUTED", disputeReason: trimmedReason },
    }),
    prisma.notification.create({
      data: {
        userId:  otherId,
        type:    "ORDER",
        message: `⚠️ ${role}เปิดข้อพิพาทสำหรับ "${order.item.title}" — เงินถูกอายัดรอผู้ดูแลระบบตรวจสอบ`,
        link:    "/dashboard/orders",
      },
    }),
  ]);

  revalidatePath("/dashboard/orders");
  revalidatePath("/admin/disputes");
  return { success: true };
}

// ─── Get Wallet Balance ───────────────────────────────────────────────────────
//
// Lightweight action used by the Buy Now confirmation panel.

export async function getWalletBalance() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { walletBalance: true, escrowBalance: true },
  });

  if (!user) return { error: "User not found" };
  return { walletBalance: user.walletBalance, escrowBalance: user.escrowBalance };
}

// ─── File Dispute (with Evidence) ────────────────────────────────────────────
//
// Called by the DisputeModal. Creates a structured Dispute record with reason
// and uploaded evidence images, then freezes the escrow order.

export async function fileDispute(
  orderId: string,
  reason: string,
  evidenceImages: string[]
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const callerId    = session.user.id;
  const trimmed     = reason.trim();
  if (!trimmed)              return { error: "กรุณาระบุเหตุผลในการเปิดข้อพิพาท" };
  if (!evidenceImages.length) return { error: "กรุณาอัปโหลดหลักฐานอย่างน้อย 1 ภาพ" };

  const order = await prisma.escrowOrder.findUnique({
    where:  { id: orderId },
    select: {
      id: true, status: true, buyerId: true, sellerId: true,
      dispute: { select: { id: true } },
      item: { select: { title: true } },
    },
  });

  if (!order)          return { error: "Order not found" };
  if (order.dispute)   return { error: "ข้อพิพาทสำหรับออเดอร์นี้ถูกเปิดแล้ว" };

  const isBuyer  = order.buyerId  === callerId;
  const isSeller = order.sellerId === callerId;
  if (!isBuyer && !isSeller) return { error: "Not authorized" };

  if (!["FUNDS_HELD", "SHIPPED"].includes(order.status)) {
    return { error: `Cannot dispute — order is already ${order.status}` };
  }

  const otherId = isBuyer ? order.sellerId : order.buyerId;
  const role    = isBuyer ? "ผู้ซื้อ" : "ผู้ขาย";

  await prisma.$transaction([
    prisma.escrowOrder.update({
      where: { id: orderId },
      data:  { status: "DISPUTED" },
    }),
    prisma.dispute.create({
      data: {
        orderId,
        reporterId:     callerId,
        reason:         trimmed,
        evidenceImages,
      },
    }),
    prisma.notification.create({
      data: {
        userId:  otherId,
        type:    "ORDER",
        message: `⚠️ ${role}เปิดข้อพิพาทสำหรับ "${order.item.title}" พร้อมหลักฐาน ${evidenceImages.length} ภาพ — รอผู้ดูแลระบบตรวจสอบ`,
        link:    "/dashboard/orders",
      },
    }),
  ]);

  revalidatePath("/dashboard/orders");
  revalidatePath("/admin/disputes");
  return { success: true };
}

// ─── Admin: Resolve Dispute ───────────────────────────────────────────────────
//
// Admin resolves a DISPUTED order. Marks both the EscrowOrder and the linked
// Dispute record as resolved in a single atomic transaction.

export async function resolveDispute(
  orderId: string,
  resolution: "REFUND_BUYER" | "RELEASE_TO_SELLER"
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const caller = session.user as { role?: string };
  if (caller.role !== "ADMIN") return { error: "Forbidden" };

  const order = await prisma.escrowOrder.findUnique({
    where:  { id: orderId },
    select: {
      id: true, status: true, amount: true,
      buyerId: true, sellerId: true,
      item: { select: { title: true } },
    },
  });

  if (!order)                      return { error: "Order not found" };
  if (order.status !== "DISPUTED") return { error: "Order is not in DISPUTED state" };

  try {
    await prisma.$transaction(async (tx) => {
      // Close the dispute record if one exists
      await tx.dispute.updateMany({
        where: { orderId, status: "OPEN" },
        data:  { status: "RESOLVED" },
      });

      if (resolution === "REFUND_BUYER") {
        await Promise.all([
          tx.escrowOrder.update({
            where: { id: orderId },
            data:  { status: "CANCELLED_BY_ADMIN" },
          }),
          tx.user.update({
            where: { id: order.buyerId },
            data:  { walletBalance: { increment: order.amount } },
          }),
          tx.user.update({
            where: { id: order.sellerId },
            data:  { escrowBalance: { decrement: order.amount } },
          }),
          tx.notification.create({
            data: {
              userId:  order.buyerId, type: "ORDER",
              message: `✅ ข้อพิพาทได้รับการแก้ไข — ฿${order.amount.toLocaleString()} ถูกคืนเข้ากระเป๋าของคุณ`,
              link: "/dashboard/orders",
            },
          }),
          tx.notification.create({
            data: {
              userId:  order.sellerId, type: "ORDER",
              message: `❌ ข้อพิพาท "${order.item.title}" ได้รับการตัดสินให้คืนเงินผู้ซื้อ`,
              link: "/dashboard/orders",
            },
          }),
        ]);
      } else {
        await Promise.all([
          tx.escrowOrder.update({
            where: { id: orderId },
            data:  { status: "COMPLETED" },
          }),
          tx.user.update({
            where: { id: order.sellerId },
            data:  {
              escrowBalance: { decrement: order.amount },
              walletBalance: { increment: order.amount },
            },
          }),
          tx.notification.create({
            data: {
              userId:  order.sellerId, type: "ORDER",
              message: `✅ ข้อพิพาทได้รับการแก้ไข — ฿${order.amount.toLocaleString()} ถูกโอนเข้ากระเป๋าของคุณ`,
              link: "/dashboard/orders",
            },
          }),
          tx.notification.create({
            data: {
              userId:  order.buyerId, type: "ORDER",
              message: `❌ ข้อพิพาท "${order.item.title}" ได้รับการตัดสินให้ชำระเงินแก่ผู้ขาย`,
              link: "/dashboard/orders",
            },
          }),
        ]);
      }
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/admin/disputes");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resolve dispute";
    return { error: msg };
  }
}

// ─── Admin: Get All Disputed Orders ──────────────────────────────────────────
//
// Fetches every DISPUTED order with full context for the admin dispute center:
// buyer/seller profiles, item, the Dispute record (reason + evidence),
// and the most recent chat messages between the two parties.

export async function getDisputedOrders() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if ((session.user as any).role !== "ADMIN") return { error: "Forbidden" };

  const orders = await prisma.escrowOrder.findMany({
    where:   { status: "DISPUTED" },
    orderBy: { updatedAt: "desc" },
    include: {
      dispute: {
        include: {
          reporter: { select: { id: true, name: true, image: true } },
        },
      },
      buyer:  { select: { id: true, name: true, image: true, email: true } },
      seller: { select: { id: true, name: true, image: true, email: true } },
      item: {
        select: {
          id: true, title: true, emoji: true,
          images: { where: { isMain: true }, take: 1 },
          conversations: {
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take:    30,
                include: {
                  sender: { select: { id: true, name: true, image: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const serialize = (o: (typeof orders)[number]) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    shippedAt: o.shippedAt?.toISOString() ?? null,
    dispute: o.dispute
      ? {
          ...o.dispute,
          createdAt: o.dispute.createdAt.toISOString(),
          updatedAt: o.dispute.updatedAt.toISOString(),
        }
      : null,
    item: {
      ...o.item,
      conversations: o.item.conversations.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        // Reverse to chronological order (we fetched desc for LIMIT efficiency)
        messages: [...c.messages].reverse().map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      })),
    },
  });

  return { orders: orders.map(serialize) };
}

// ─── Admin: Auto-Release Stale Shipped Orders ─────────────────────────────────
//
// Safety valve: if a buyer never confirms receipt after 7 days of shipping,
// automatically release funds to the seller. Designed to be triggered manually
// from the admin dashboard (or via cron in production).

export async function checkAndAutoReleaseEscrows() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if ((session.user as any).role !== "ADMIN") return { error: "Forbidden" };

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const stale = await prisma.escrowOrder.findMany({
    where: {
      status:    "SHIPPED",
      shippedAt: { lt: cutoff },
    },
    select: {
      id: true, amount: true, sellerPayout: true, totalAmount: true,
      buyerId: true, sellerId: true,
      item: { select: { title: true } },
    },
  });

  if (stale.length === 0) return { success: true, released: 0 };

  let released = 0;
  for (const order of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        const seller = await tx.user.findUniqueOrThrow({
          where: { id: order.sellerId }, select: { escrowBalance: true },
        });
        const payout          = order.sellerPayout ?? order.amount;
        const escrowDecrement = order.totalAmount  ?? order.amount;
        await Promise.all([
          tx.escrowOrder.update({
            where: { id: order.id },
            data:  { status: "COMPLETED", completedAt: new Date() },
          }),
          tx.user.update({
            where: { id: order.sellerId },
            data:  {
              escrowBalance: Math.max(0, seller.escrowBalance - escrowDecrement),
              walletBalance: { increment: payout },
            },
          }),
          tx.notification.create({
            data: {
              userId:  order.sellerId, type: "ORDER",
              message: `✅ ระบบปลดล็อคเงิน ฿${payout.toLocaleString()} อัตโนมัติ — "${order.item.title}" (ผ่าน 7 วันหลังจัดส่ง)`,
              link: "/dashboard/orders",
            },
          }),
          tx.notification.create({
            data: {
              userId:  order.buyerId, type: "ORDER",
              message: `📋 "${order.item.title}" ถูกปิดอัตโนมัติ เนื่องจากไม่มีการยืนยันภายใน 7 วัน`,
              link: "/dashboard/orders",
            },
          }),
        ]);
      });
      released++;
    } catch {
      // Log and continue — don't abort the whole batch for one failure
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/admin/disputes");
  return { success: true, released };
}

// ─── Get My Orders ────────────────────────────────────────────────────────────
//
// Used by the /dashboard/orders page. Returns orders split by role.

export async function getMyOrders() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const userId = session.user.id;

  const [buying, selling, wallet] = await Promise.all([
    prisma.escrowOrder.findMany({
      where:   { buyerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        item:   {
          select: {
            id: true, title: true, emoji: true,
            images: { where: { isMain: true }, take: 1 },
            conversations: {
              where: { members: { some: { id: userId } } },
              select: { id: true },
              take: 1,
            },
          },
        },
        seller: { select: { id: true, name: true, image: true } },
        buyer:  { select: { id: true, name: true, image: true } },
        review: { select: { id: true, rating: true } },
      },
    }),
    prisma.escrowOrder.findMany({
      where:   { sellerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        item:  {
          select: {
            id: true, title: true, emoji: true,
            images: { where: { isMain: true }, take: 1 },
            conversations: {
              where: { members: { some: { id: userId } } },
              select: { id: true },
              take: 1,
            },
          },
        },
        buyer:  { select: { id: true, name: true, image: true } },
        seller: { select: { id: true, name: true, image: true } },
        review: { select: { id: true, rating: true } },
      },
    }),
    prisma.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { walletBalance: true, escrowBalance: true },
    }),
  ]);

  // Serialize dates for client components
  const serialize = (o: typeof buying[number] | typeof selling[number]) => ({
    ...o,
    createdAt:             o.createdAt.toISOString(),
    updatedAt:             o.updatedAt.toISOString(),
    shippedAt:             (o as { shippedAt?: Date | null }).shippedAt
                             ? (o as { shippedAt: Date }).shippedAt.toISOString()
                             : null,
    meetupDateTime:        (o as { meetupDateTime?: Date | null }).meetupDateTime
                             ? (o as { meetupDateTime: Date }).meetupDateTime.toISOString()
                             : null,
    handoverConfirmedAt:   (o as { handoverConfirmedAt?: Date | null }).handoverConfirmedAt
                             ? (o as { handoverConfirmedAt: Date }).handoverConfirmedAt.toISOString()
                             : null,
  });

  return {
    buying:        buying.map(serialize),
    selling:       selling.map(serialize),
    walletBalance: wallet.walletBalance,
    escrowBalance: wallet.escrowBalance,
  };
}

// ─── Submit Order Review ──────────────────────────────────────────────────────
//
// Called by the buyer immediately after confirming receipt.
// Enforces: buyer-only, COMPLETED order, one review per order.
// Updates the seller's trustScore: 5★ = +10, 4★ = +5, 3★ = 0, 2★ = -5, 1★ = -10.

const REVIEW_TRUST_DELTA: Record<number, number> = {
  5: +10, 4: +5, 3: 0, 2: -5, 1: -10,
};

export async function submitOrderReview(
  orderId: string,
  rating:  number,
  comment?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be an integer between 1 and 5" };
  }

  const buyerId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({
    where:  { id: orderId },
    select: {
      id: true, status: true, buyerId: true, sellerId: true,
      review: { select: { id: true } },
      item:   { select: { title: true } },
    },
  });

  if (!order)                        return { error: "Order not found" };
  if (order.buyerId !== buyerId)     return { error: "Only the buyer can leave a review" };
  if (order.status !== "COMPLETED")  return { error: "Order is not completed yet" };
  if (order.review)                  return { error: "You have already reviewed this order" };

  const delta = REVIEW_TRUST_DELTA[rating] ?? 0;

  try {
    await prisma.$transaction(async (tx) => {
      const seller = await tx.user.findUniqueOrThrow({
        where:  { id: order.sellerId },
        select: { trustScore: true },
      });

      const newScore = Math.max(0, Math.min(200, seller.trustScore + delta));

      await Promise.all([
        tx.review.create({
          data: {
            orderId,
            rating,
            comment:    comment?.trim() || null,
            reviewerId: buyerId,
            revieweeId: order.sellerId,
          },
        }),
        tx.user.update({
          where: { id: order.sellerId },
          data:  { trustScore: newScore },
        }),
        tx.notification.create({
          data: {
            userId:  order.sellerId,
            type:    "ORDER",
            message: `${"⭐".repeat(rating)} ผู้ซื้อให้คะแนน ${rating}/5 สำหรับ "${order.item.title}"${comment?.trim() ? ` — "${comment.trim()}"` : ""}`,
            link:    `/user/${order.sellerId}`,
          },
        }),
      ]);
    });

    revalidatePath("/dashboard/orders");
    revalidatePath(`/user/${order.sellerId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit review";
    return { error: msg };
  }
}
