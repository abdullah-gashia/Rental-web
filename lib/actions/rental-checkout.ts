"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Validation Schema ────────────────────────────────────────────────────────

const CreateRentalSchema = z.object({
  itemId:            z.string().cuid(),
  rentalStartDate:   z.string().datetime(),
  rentalEndDate:     z.string().datetime(),
  pickupLocation:    z.string().min(1, "กรุณาเลือกสถานที่นัดรับ"),
  pickupDateTime:    z.string().datetime(),
  pickupNote:        z.string().max(500).optional(),
  returnLocation:    z.string().min(1, "กรุณาระบุสถานที่คืนของ"),
  paymentMethod:     z.enum(["ESCROW", "COD"]),
  agreementAccepted: z.literal(true, "กรุณายอมรับเงื่อนไขการเช่า"),
});

type CreateRentalInput = z.infer<typeof CreateRentalSchema>;

export type RentalOrderResult =
  | { success: true;  orderId: string }
  | { success: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function generateAgreementText(
  itemTitle: string,
  rentalDays: number,
  deposit: number,
  lateFeePerDay: number,
): string {
  return [
    `สัญญาเช่าทรัพย์สินดิจิทัล — PSU Store`,
    `สินค้า: ${itemTitle}`,
    `ระยะเวลาเช่า: ${rentalDays} วัน`,
    `เงินมัดจำ: ฿${deposit}`,
    `1. ผู้เช่าตกลงเช่าสินค้าตามระยะเวลาที่ระบุข้างต้น`,
    `2. ผู้เช่าต้องดูแลสินค้าเสมือนของตนเองและคืนในสภาพเดิม`,
    `3. หากสินค้าชำรุดเสียหาย ผู้เช่ายินยอมให้หักค่าเสียหายจากเงินมัดจำ`,
    `4. หากสินค้าสูญหาย ยินยอมให้ริบเงินมัดจำทั้งจำนวน`,
    lateFeePerDay > 0 ? `5. ค่าปรับคืนช้า: ฿${lateFeePerDay}/วัน` : `5. ไม่มีค่าปรับคืนช้า`,
    `6. ข้อตกลงนี้มีผลผูกพันตามกฎหมายแพ่งและพาณิชย์ มาตรา 537–571`,
    `7. แพลตฟอร์มใช้ Digital Handshake เป็นหลักฐานในการตัดสินข้อพิพาท`,
  ].join("\n");
}

// ─── Main Action ──────────────────────────────────────────────────────────────

export async function createRentalOrder(input: CreateRentalInput): Promise<RentalOrderResult> {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };
  const renterId = session.user.id;

  // 2. Validate
  const parsed = CreateRentalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const data = parsed.data;

  // 3. Load item
  const item = await prisma.item.findUnique({
    where: { id: data.itemId },
    include: { seller: { select: { id: true, name: true } } },
  });

  if (!item)                          return { success: false, error: "ไม่พบสินค้า" };
  if (item.listingType !== "RENT")    return { success: false, error: "สินค้านี้ไม่ใช่รายการให้เช่า" };
  if (item.status !== "APPROVED")     return { success: false, error: "สินค้านี้ไม่พร้อมให้เช่าในขณะนี้" };
  if (item.sellerId === renterId)     return { success: false, error: "ไม่สามารถเช่าสินค้าของตัวเองได้" };

  // 4. Check renter KYC
  const renter = await prisma.user.findUnique({
    where: { id: renterId },
    select: { walletBalance: true, verificationStatus: true },
  });
  if (!renter) return { success: false, error: "ไม่พบข้อมูลผู้ใช้" };
  if (renter.verificationStatus !== "APPROVED") {
    return { success: false, error: "กรุณายืนยันตัวตน (KYC) ก่อนเช่าสินค้า" };
  }

  // 5. Validate dates
  const startDate = new Date(data.rentalStartDate);
  const endDate   = new Date(data.rentalEndDate);
  const today     = new Date(); today.setHours(0, 0, 0, 0);

  if (startDate < today)   return { success: false, error: "วันเริ่มเช่าต้องไม่เป็นวันในอดีต" };
  if (endDate <= startDate) return { success: false, error: "วันสิ้นสุดต้องหลังวันเริ่มเช่า" };

  const rentalDays   = daysBetween(startDate, endDate);
  const minDays      = item.minRentalDays ?? 1;
  const maxDays      = item.maxRentalDays ?? 30;

  if (rentalDays < minDays) return { success: false, error: `ต้องเช่าขั้นต่ำ ${minDays} วัน` };
  if (rentalDays > maxDays) return { success: false, error: `เช่าได้สูงสุด ${maxDays} วัน` };

  // 6. Check no overlapping active rental for this item
  const overlap = await prisma.rentalOrder.findFirst({
    where: {
      itemId: data.itemId,
      status: { in: ["REQUESTED","APPROVED","DEPOSIT_HELD","PICKUP_SCHEDULED","HANDED_OVER","ACTIVE","OVERDUE","RENEWAL_REQUESTED","RETURN_SCHEDULED"] },
      rentalStartDate: { lte: endDate },
      rentalEndDate:   { gte: startDate },
    },
  });
  if (overlap) return { success: false, error: "สินค้านี้ถูกจองในช่วงเวลานั้นแล้ว" };

  // 7. Calculate pricing
  const dailyRate       = item.dailyRate       ?? 0;
  const securityDeposit = item.securityDeposit ?? 0;
  const rentalFee       = dailyRate * rentalDays;
  const platformFee     = Math.round(rentalFee * 0.05 * 100) / 100;
  const totalPaid       = rentalFee + platformFee + securityDeposit;
  const escrowDeduct    = data.paymentMethod === "ESCROW" ? totalPaid : securityDeposit;

  // 8. Wallet check
  if (renter.walletBalance < escrowDeduct) {
    return {
      success: false,
      error: data.paymentMethod === "ESCROW"
        ? `ยอดเงินไม่เพียงพอ (ต้องการ ฿${totalPaid.toLocaleString()})`
        : `ยอดเงินมัดจำไม่เพียงพอ (ต้องการ ฿${securityDeposit.toLocaleString()})`,
    };
  }

  // 9. Serializable transaction
  let orderId: string;
  try {
    const order = await prisma.$transaction(async (tx) => {
      // Re-read item inside lock
      const freshItem = await tx.item.findUnique({ where: { id: data.itemId } });
      if (!freshItem || freshItem.status !== "APPROVED") {
        throw new Error("สินค้านี้ไม่พร้อมให้เช่าในขณะนี้");
      }

      // Deduct wallet
      await tx.user.update({
        where: { id: renterId },
        data: { walletBalance: { decrement: escrowDeduct } },
      });

      // Create rental order
      const newOrder = await tx.rentalOrder.create({
        data: {
          renterId,
          ownerId:         item.sellerId,
          itemId:          data.itemId,
          rentalStartDate: startDate,
          rentalEndDate:   endDate,
          rentalDays,
          dailyRate,
          rentalFee,
          securityDeposit,
          platformFee,
          totalPaid,
          pickupLocation:  data.pickupLocation,
          pickupDateTime:  new Date(data.pickupDateTime),
          pickupNote:      data.pickupNote ?? null,
          returnLocation:  data.returnLocation,
          status:          "REQUESTED",
          agreementAcceptedAt: new Date(),
          agreementText:   generateAgreementText(
            item.title, rentalDays, securityDeposit, item.lateFeePerDay ?? 0
          ),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          statusHistory: [{
            status: "REQUESTED",
            changedAt: new Date().toISOString(),
            note: "สร้างคำขอเช่า",
          }],
        },
      });

      // Mark item RESERVED
      await tx.item.update({
        where: { id: data.itemId },
        data: { status: "RENTED" },   // using RENTED to block other buyers/renters
      });

      return newOrder;
    }, { isolationLevel: "Serializable" });

    orderId = order.id;
  } catch (err: any) {
    return { success: false, error: err.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่" };
  }

  // 10. Notify owner (fire-and-forget)
  try {
    await prisma.notification.create({
      data: {
        userId:  item.sellerId,
        type:    "ORDER",
        message: `มีคำขอเช่าสินค้าใหม่ — "${item.title}" จำนวน ${rentalDays} วัน`,
      },
    });
  } catch { /* non-critical */ }

  revalidatePath("/rental/orders");
  revalidatePath(`/rental/orders/${orderId}`);
  revalidatePath("/dashboard");

  return { success: true, orderId };
}

// ─── Get rental order detail ──────────────────────────────────────────────────

export async function getRentalOrderDetail(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    include: {
      item: {
        include: {
          images: { select: { url: true, isMain: true }, orderBy: { order: "asc" } },
          category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
        },
      },
      renter: { select: { id: true, name: true, image: true, verificationStatus: true } },
      owner:  { select: { id: true, name: true, image: true, verificationStatus: true } },
    },
  });

  if (!order) return null;
  if (order.renterId !== userId && order.ownerId !== userId) return null;

  // Safely parse Json fields — Prisma returns them as-is which may be a string
  // if they were stored via JSON.stringify(), or a proper JS value otherwise.
  function safeArray(v: unknown): any[] {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }

  return {
    ...order,
    currentUserRole: order.renterId === userId ? "RENTER" : "OWNER" as "RENTER" | "OWNER",
    rentalStartDate: order.rentalStartDate.toISOString(),
    rentalEndDate:   order.rentalEndDate.toISOString(),
    actualReturnDate: order.actualReturnDate?.toISOString() ?? null,
    pickupDateTime:   order.pickupDateTime?.toISOString()   ?? null,
    actualPickupAt:   order.actualPickupAt?.toISOString()   ?? null,
    expiresAt:        order.expiresAt?.toISOString()        ?? null,
    completedAt:      order.completedAt?.toISOString()      ?? null,
    createdAt:        order.createdAt.toISOString(),
    updatedAt:        order.updatedAt.toISOString(),
    statusHistory:    safeArray(order.statusHistory) as Array<{ status: string; changedAt: string; note?: string }>,
    renewalHistory:   safeArray(order.renewalHistory),
  };
}

// ─── Get my rental orders (dashboard) ────────────────────────────────────────

export async function getMyRentalOrders() {
  const session = await auth();
  if (!session?.user?.id) return { asRenter: [], asOwner: [] };
  const userId = session.user.id;

  const [asRenter, asOwner] = await Promise.all([
    prisma.rentalOrder.findMany({
      where: { renterId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        item:  { select: { id: true, title: true, emoji: true, images: { take: 1, orderBy: { order: "asc" } } } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.rentalOrder.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        item:   { select: { id: true, title: true, emoji: true, images: { take: 1, orderBy: { order: "asc" } } } },
        renter: { select: { id: true, name: true } },
      },
    }),
  ]);

  const serialize = (o: any) => ({
    ...o,
    rentalStartDate:  o.rentalStartDate.toISOString(),
    rentalEndDate:    o.rentalEndDate.toISOString(),
    actualReturnDate: o.actualReturnDate?.toISOString() ?? null,
    createdAt:        o.createdAt.toISOString(),
    updatedAt:        o.updatedAt.toISOString(),
    expiresAt:        o.expiresAt?.toISOString() ?? null,
    completedAt:      o.completedAt?.toISOString() ?? null,
  });

  return { asRenter: asRenter.map(serialize), asOwner: asOwner.map(serialize) };
}
