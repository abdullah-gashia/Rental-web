"use server";

import { z }               from "zod";
import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { revalidatePath }  from "next/cache";
import type { ActionResult, PaginatedResponse, TableQueryParams, OrderRow } from "../_lib/types";
import { paginationMeta }  from "../_lib/utils";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

// ─── getOrders ────────────────────────────────────────────────────────────────

type GetOrdersParams = TableQueryParams & { status?: string; statusGroup?: string };

export async function getOrders(
  params: GetOrdersParams
): Promise<PaginatedResponse<OrderRow>> {
  await requireAdmin();

  const page      = Math.max(1, params.page ?? 1);
  const pageSize  = Math.min(params.pageSize ?? 20, 100);
  const skip      = (page - 1) * pageSize;
  const search    = params.search?.trim();
  const sortBy    = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { buyer:  { name:  { contains: search, mode: "insensitive" } } },
      { buyer:  { email: { contains: search, mode: "insensitive" } } },
      { seller: { name:  { contains: search, mode: "insensitive" } } },
      { seller: { email: { contains: search, mode: "insensitive" } } },
      { item:   { title: { contains: search, mode: "insensitive" } } },
    ];
  }

  const validStatuses = [
    // Legacy
    "FUNDS_HELD", "SHIPPED", "COMPLETED", "DISPUTED",
    "REFUNDED", "CANCELLED", "CANCELLED_BY_ADMIN",
    // Checkout wizard — Escrow
    "PENDING_CONFIRMATION", "DELIVERED",
    // Escrow + Meetup
    "MEETUP_SCHEDULED", "MEETUP_COMPLETED",
    // COD + Shipping
    "AWAITING_SHIPMENT", "COD_SHIPPED", "COD_DELIVERED",
    // COD + Meetup
    "MEETUP_ARRANGED", "MEETUP_CASH_COMPLETED",
  ];

  // Status-group quick filter (maps friendly tab names → status arrays)
  const STATUS_GROUPS: Record<string, string[]> = {
    pending:    ["PENDING_CONFIRMATION"],
    active:     ["FUNDS_HELD", "SHIPPED", "MEETUP_SCHEDULED", "AWAITING_SHIPMENT",
                 "COD_SHIPPED", "MEETUP_ARRANGED", "DELIVERED"],
    completed:  ["COMPLETED", "MEETUP_COMPLETED", "COD_DELIVERED",
                 "MEETUP_CASH_COMPLETED", "REFUNDED"],
    problem:    ["DISPUTED", "CANCELLED", "CANCELLED_BY_ADMIN"],
  };

  if (params.statusGroup && STATUS_GROUPS[params.statusGroup]) {
    where.status = { in: STATUS_GROUPS[params.statusGroup] };
  } else if (params.status && validStatuses.includes(params.status)) {
    where.status = params.status;
  }

  const orderBy = { [sortBy]: sortOrder };

  const [orders, totalCount] = await Promise.all([
    prisma.escrowOrder.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        buyer:  { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        item: {
          select: {
            id: true, title: true,
            images: { where: { isMain: true }, take: 1, select: { url: true } },
          },
        },
        dispute: { select: { id: true } },
      },
    }),
    prisma.escrowOrder.count({ where }),
  ]);

  return {
    data: orders.map((o) => ({
      id:              o.id,
      shortRef:        o.id.slice(-8).toUpperCase(),
      buyer:           o.buyer,
      seller:          o.seller,
      item: {
        id:           o.item.id,
        title:        o.item.title,
        thumbnailUrl: o.item.images[0]?.url ?? null,
      },
      amount:          o.amount,
      totalAmount:     o.totalAmount ?? null,
      status:          o.status,
      deliveryMethod:  o.deliveryMethod ?? null,
      paymentMethod:   o.paymentMethod  ?? null,
      shippingAddress: (o.shippingAddress as Record<string, string> | null) ?? null,
      meetupLocation:  o.meetupLocation  ?? null,
      meetupDateTime:  o.meetupDateTime?.toISOString() ?? null,
      shippedAt:       o.shippedAt?.toISOString()      ?? null,
      trackingNumber:  o.trackingNumber  ?? null,
      createdAt:       o.createdAt.toISOString(),
      hasDispute:      o.dispute !== null,
    })),
    meta: paginationMeta(totalCount, page, pageSize),
  };
}

// ─── forceCompleteOrder ───────────────────────────────────────────────────────

const IdSchema = z.object({ id: z.string().min(1) });

export async function forceCompleteOrder(orderId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id } = IdSchema.parse({ id: orderId });

    const order = await prisma.escrowOrder.findUnique({ where: { id } });
    if (!order) return { success: false, error: "ไม่พบคำสั่งซื้อ" };

    // Release escrow funds to seller
    await prisma.$transaction([
      prisma.escrowOrder.update({
        where: { id },
        data:  { status: "COMPLETED" },
      }),
      prisma.user.update({
        where: { id: order.sellerId },
        data:  { walletBalance: { increment: order.amount } },
      }),
      prisma.user.update({
        where: { id: order.buyerId },
        data:  { escrowBalance: { decrement: order.amount } },
      }),
    ]);

    revalidatePath("/admin/orders");
    return { success: true, message: "บังคับให้คำสั่งซื้อสำเร็จเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── forceCancelOrder ─────────────────────────────────────────────────────────

const CancelSchema = z.object({
  id:     z.string().min(1),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500),
});

export async function forceCancelOrder(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = CancelSchema.parse({ id: orderId, reason });

    const order = await prisma.escrowOrder.findUnique({ where: { id: parsed.id } });
    if (!order) return { success: false, error: "ไม่พบคำสั่งซื้อ" };

    // Refund escrow back to buyer
    await prisma.$transaction([
      prisma.escrowOrder.update({
        where: { id: parsed.id },
        data:  { status: "CANCELLED_BY_ADMIN", cancelReason: parsed.reason },
      }),
      prisma.user.update({
        where: { id: order.buyerId },
        data:  {
          walletBalance:  { increment: order.amount },
          escrowBalance:  { decrement: order.amount },
        },
      }),
    ]);

    revalidatePath("/admin/orders");
    return { success: true, message: "ยกเลิกคำสั่งซื้อและคืนเงินเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
