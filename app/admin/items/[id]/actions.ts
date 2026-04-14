"use server";

import { z }              from "zod";
import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { revalidatePath }  from "next/cache";
import { redirect }        from "next/navigation";
import { EscrowStatus }    from "@prisma/client";
import type { ActionResult } from "../../_lib/types";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminItemDetail = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  emoji: string | null;
  color: string | null;
  listingType: string;
  condition: string;
  status: string;
  rejectReason: string | null;
  negotiable: boolean;
  shippable: boolean;
  location: string | null;
  contact: string | null;
  images: { id: string; url: string; isMain: boolean }[];

  // Delivery & Payment Config
  allowShipping: boolean;
  allowMeetup: boolean;
  allowCOD: boolean;
  shippingNote: string | null;

  // Engagement Metrics
  viewCount: number;
  wishlistCount: number;
  interactionCount: number;
  lastViewedAt: string | null;

  // System Metadata
  createdAt: string;
  updatedAt: string;

  // Category
  category: { id: string; nameTh: string; nameEn: string; emoji: string | null };

  // Seller Info
  seller: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    isBanned: boolean;
    verificationStatus: string;
    psuIdType: string | null;
    trustScore: number;
    itemCount: number;
    completedSalesCount: number;
    createdAt: string;
  };

  // Order History
  orders: Array<{
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    amount: number;
    totalAmount: number | null;
    paymentMethod: string | null;
    deliveryMethod: string | null;
    status: string;
    createdAt: string;
  }>;

  // Placeholders for future models
  reportCount: number;
  reports: Array<{ reporterName: string; reason: string; createdAt: string }>;
  auditLog: Array<{ action: string; adminName: string; note: string | null; createdAt: string }>;
};

// ─── getAdminItemDetail ───────────────────────────────────────────────────────

export async function getAdminItemDetail(itemId: string): Promise<AdminItemDetail | null> {
  await requireAdmin();

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      category: {
        select: { id: true, nameTh: true, nameEn: true, emoji: true },
      },
      images: {
        select: { id: true, url: true, isMain: true },
        orderBy: [{ isMain: "desc" }, { order: "asc" }],
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isBanned: true,
          verificationStatus: true,
          psuIdType: true,
          trustScore: true,
          createdAt: true,
          _count: {
            select: {
              items: true,
              escrowOrdersSelling: { where: { status: "COMPLETED" } },
            },
          },
        },
      },
      escrowOrders: {
        select: {
          id: true,
          buyer: { select: { name: true, email: true } },
          amount: true,
          totalAmount: true,
          paymentMethod: true,
          deliveryMethod: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          wishlists: true,
          interactions: true,
        },
      },
    },
  });

  if (!item) return null;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    emoji: item.emoji,
    color: item.color,
    listingType: item.listingType,
    condition: item.condition,
    status: item.status,
    rejectReason: item.rejectReason,
    negotiable: item.negotiable,
    shippable: item.shippable,
    location: item.location,
    contact: item.contact,
    images: item.images,

    allowShipping: item.allowShipping,
    allowMeetup: item.allowMeetup,
    allowCOD: item.allowCOD,
    shippingNote: item.shippingNote,

    viewCount: item.viewCount,
    wishlistCount: item._count.wishlists,
    interactionCount: item._count.interactions,
    lastViewedAt: item.lastViewedAt?.toISOString() ?? null,

    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),

    category: item.category,

    seller: {
      id: item.seller.id,
      name: item.seller.name,
      email: item.seller.email,
      image: item.seller.image,
      role: item.seller.role,
      isBanned: item.seller.isBanned,
      verificationStatus: item.seller.verificationStatus,
      psuIdType: item.seller.psuIdType,
      trustScore: item.seller.trustScore,
      itemCount: item.seller._count.items,
      completedSalesCount: item.seller._count.escrowOrdersSelling,
      createdAt: item.seller.createdAt.toISOString(),
    },

    orders: item.escrowOrders.map((o) => ({
      id: o.id,
      buyerName: o.buyer.name,
      buyerEmail: o.buyer.email,
      amount: o.amount,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      deliveryMethod: o.deliveryMethod,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),

    // No AuditLog or Report models yet — placeholder
    reportCount: 0,
    reports: [],
    auditLog: [],
  };
}

// ─── Moderation Actions ───────────────────────────────────────────────────────

const ACTIVE_ORDER_STATUSES: EscrowStatus[] = [
  EscrowStatus.FUNDS_HELD,
  EscrowStatus.SHIPPED,
  EscrowStatus.PENDING_CONFIRMATION,
  EscrowStatus.MEETUP_SCHEDULED,
  EscrowStatus.AWAITING_SHIPMENT,
  EscrowStatus.COD_SHIPPED,
  EscrowStatus.MEETUP_ARRANGED,
];

async function notifySeller(sellerId: string, message: string, itemId: string) {
  await prisma.notification.create({
    data: {
      userId: sellerId,
      type: "MODERATION",
      message,
      link: `/dashboard`,
    },
  });
}

// ── Approve Item ──

export async function approveItemDetail(itemId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { status: true, title: true, sellerId: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status !== "PENDING") {
      return { success: false, error: "สินค้านี้ไม่อยู่ในสถานะรออนุมัติ" };
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { status: "APPROVED", rejectReason: null },
    });

    await notifySeller(
      item.sellerId,
      `สินค้า "${item.title}" ของคุณผ่านการอนุมัติแล้ว`,
      itemId,
    );

    revalidatePath(`/admin/items/${itemId}`);
    revalidatePath("/admin/items");
    revalidatePath("/admin/approvals");
    return { success: true, message: "อนุมัติสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ── Reject Item ──

const RejectSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500),
});

export async function rejectItemDetail(
  itemId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = RejectSchema.parse({ itemId, reason });

    const item = await prisma.item.findUnique({
      where: { id: parsed.itemId },
      select: { status: true, title: true, sellerId: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status !== "PENDING") {
      return { success: false, error: "สินค้านี้ไม่อยู่ในสถานะรออนุมัติ" };
    }

    await prisma.item.update({
      where: { id: parsed.itemId },
      data: { status: "REJECTED", rejectReason: parsed.reason },
    });

    await notifySeller(
      item.sellerId,
      `สินค้า "${item.title}" ถูกปฏิเสธ: ${parsed.reason}`,
      parsed.itemId,
    );

    revalidatePath(`/admin/items/${parsed.itemId}`);
    revalidatePath("/admin/items");
    revalidatePath("/admin/approvals");
    return { success: true, message: "ปฏิเสธสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ── Suspend Item (→ UNAVAILABLE) ──

const SuspendSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500),
});

export async function suspendItemDetail(
  itemId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = SuspendSchema.parse({ itemId, reason });

    const item = await prisma.item.findUnique({
      where: { id: parsed.itemId },
      select: { status: true, title: true, sellerId: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status !== "APPROVED" && item.status !== "ACTIVE") {
      return { success: false, error: "สินค้านี้ไม่สามารถระงับได้ในสถานะปัจจุบัน" };
    }

    // Check for active orders
    const activeOrders = await prisma.escrowOrder.count({
      where: {
        itemId: parsed.itemId,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
    });
    if (activeOrders > 0) {
      return { success: false, error: "ไม่สามารถระงับได้ มีคำสั่งซื้อที่กำลังดำเนินอยู่" };
    }

    await prisma.item.update({
      where: { id: parsed.itemId },
      data: { status: "UNAVAILABLE", rejectReason: parsed.reason },
    });

    await notifySeller(
      item.sellerId,
      `สินค้า "${item.title}" ถูกระงับ: ${parsed.reason}`,
      parsed.itemId,
    );

    revalidatePath(`/admin/items/${parsed.itemId}`);
    revalidatePath("/admin/items");
    return { success: true, message: "ระงับสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ── Unsuspend Item ──

export async function unsuspendItemDetail(itemId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { status: true, title: true, sellerId: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status !== "UNAVAILABLE") {
      return { success: false, error: "สินค้านี้ไม่ได้ถูกระงับ" };
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { status: "APPROVED", rejectReason: null },
    });

    await notifySeller(
      item.sellerId,
      `สินค้า "${item.title}" ถูกปลดระงับแล้ว`,
      itemId,
    );

    revalidatePath(`/admin/items/${itemId}`);
    revalidatePath("/admin/items");
    return { success: true, message: "ปลดระงับสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ── Re-approve Item (from REJECTED) ──

export async function reapproveItemDetail(itemId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { status: true, title: true, sellerId: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status !== "REJECTED") {
      return { success: false, error: "สินค้านี้ไม่ได้ถูกปฏิเสธ" };
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { status: "APPROVED", rejectReason: null },
    });

    await notifySeller(
      item.sellerId,
      `สินค้า "${item.title}" ได้รับการอนุมัติใหม่แล้ว`,
      itemId,
    );

    revalidatePath(`/admin/items/${itemId}`);
    revalidatePath("/admin/items");
    return { success: true, message: "อนุมัติสินค้าใหม่เรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ── Delete Item (soft-delete → REMOVED) ──

const DeleteSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500),
});

export async function deleteItemDetail(
  itemId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = DeleteSchema.parse({ itemId, reason });

    const item = await prisma.item.findUnique({
      where: { id: parsed.itemId },
      select: { status: true, title: true, sellerId: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status === "REMOVED") {
      return { success: false, error: "สินค้านี้ถูกลบไปแล้ว" };
    }

    // Check for active orders
    const activeOrders = await prisma.escrowOrder.count({
      where: {
        itemId: parsed.itemId,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
    });
    if (activeOrders > 0) {
      return { success: false, error: "ไม่สามารถลบได้ มีคำสั่งซื้อที่กำลังดำเนินอยู่ กรุณาระงับแทน" };
    }

    await prisma.item.update({
      where: { id: parsed.itemId },
      data: { status: "REMOVED", rejectReason: parsed.reason },
    });

    await notifySeller(
      item.sellerId,
      `สินค้า "${item.title}" ถูกลบโดยผู้ดูแลระบบ: ${parsed.reason}`,
      parsed.itemId,
    );

    revalidatePath("/admin/items");
    redirect("/admin/items");
  } catch (e: unknown) {
    // redirect() throws a special error — let it propagate
    if (e instanceof Error && "digest" in e && typeof (e as any).digest === "string" && (e as any).digest.startsWith("NEXT_REDIRECT")) throw e;
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
