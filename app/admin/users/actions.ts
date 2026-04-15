"use server";

import { z }                from "zod";
import { auth }             from "@/lib/auth";
import { prisma }           from "@/lib/prisma";
import { revalidatePath }   from "next/cache";
import type { ActionResult, PaginatedResponse, TableQueryParams, UserRow } from "../_lib/types";
import { paginationMeta }   from "../_lib/utils";

// ─── Auth guard helper ────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; name?: string | null };
}

// ─── getUsers ─────────────────────────────────────────────────────────────────

type GetUsersParams = TableQueryParams & { role?: string; banned?: string };

export async function getUsers(
  params: GetUsersParams
): Promise<PaginatedResponse<UserRow>> {
  await requireAdmin();

  const page     = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const skip     = (page - 1) * pageSize;
  const search   = params.search?.trim();
  const sortBy   = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";

  // WHERE clause
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.role === "ADMIN" || params.role === "STUDENT") {
    where.role = params.role;
  }
  if (params.banned === "true")  where.isBanned = true;
  if (params.banned === "false") where.isBanned = false;

  const orderBy = { [sortBy]: sortOrder };

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        _count: {
          select: {
            items:              true,
            escrowOrdersBuying: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((u) => ({
      id:         u.id,
      name:       u.name,
      email:      u.email,
      role:       u.role,
      isBanned:   u.isBanned,
      trustScore: u.trustScore,
      itemCount:  u._count.items,
      orderCount: u._count.escrowOrdersBuying,
      createdAt:  u.createdAt.toISOString(),
    })),
    meta: paginationMeta(totalCount, page, pageSize),
  };
}

// ─── banUser ──────────────────────────────────────────────────────────────────

const BanSchema = z.object({ userId: z.string().min(1) });

export async function banUser(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const { userId: id } = BanSchema.parse({ userId });
    if (id === admin.id) return { success: false, error: "ไม่สามารถแบนตัวเองได้" };

    await prisma.user.update({
      where: { id },
      data:  { isBanned: true, bannedAt: new Date() },
    });
    revalidatePath("/admin/users");
    return { success: true, message: "แบนผู้ใช้เรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── unbanUser ────────────────────────────────────────────────────────────────

export async function unbanUser(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    BanSchema.parse({ userId });
    await prisma.user.update({
      where: { id: userId },
      data:  { isBanned: false, bannedAt: null },
    });
    revalidatePath("/admin/users");
    return { success: true, message: "ปลดแบนผู้ใช้เรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── updateUserRole ───────────────────────────────────────────────────────────

const RoleSchema = z.object({
  userId:  z.string().min(1),
  newRole: z.enum(["ADMIN", "STUDENT"]),
});

export async function updateUserRole(
  userId: string,
  newRole: "ADMIN" | "STUDENT"
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = RoleSchema.parse({ userId, newRole });
    if (parsed.userId === admin.id) {
      return { success: false, error: "ไม่สามารถเปลี่ยนบทบาทของตัวเองได้" };
    }
    await prisma.user.update({
      where: { id: parsed.userId },
      data:  { role: parsed.newRole },
    });
    revalidatePath("/admin/users");
    return { success: true, message: "เปลี่ยนบทบาทเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── getUserDetail ────────────────────────────────────────────────────────────

import type { UserDetail } from "../_lib/types";
import { EscrowStatus, ItemStatus } from "@prisma/client";

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, image: true, phone: true, bio: true,
      role: true, isBanned: true, trustScore: true,
      walletBalance: true, escrowBalance: true,
      createdAt: true, verificationStatus: true,
      psuIdNumber: true, psuIdType: true, verifiedAt: true,
    },
  });
  if (!user) return null;

  // ── Financial aggregations ──────────────────────────────────────────────
  const ACTIVE_ESCROW_STATUSES: EscrowStatus[] = [
    "PENDING_CONFIRMATION", "FUNDS_HELD", "SHIPPED",
    "DELIVERED", "MEETUP_SCHEDULED", "MEETUP_COMPLETED", "DISPUTED",
  ];

  const [buyerEscrow, sellerPayout, totalSales, totalPurchases] = await Promise.all([
    prisma.escrowOrder.aggregate({
      where: { buyerId: userId, status: { in: ACTIVE_ESCROW_STATUSES } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.escrowOrder.aggregate({
      where: {
        sellerId: userId,
        status: { in: ["FUNDS_HELD", "SHIPPED", "DELIVERED", "MEETUP_SCHEDULED", "MEETUP_COMPLETED"] as EscrowStatus[] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.escrowOrder.aggregate({
      where: {
        sellerId: userId,
        status: { in: ["COMPLETED", "MEETUP_COMPLETED", "MEETUP_CASH_COMPLETED", "COD_DELIVERED"] as EscrowStatus[] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.escrowOrder.aggregate({
      where: {
        buyerId: userId,
        status: { in: ["COMPLETED", "MEETUP_COMPLETED", "MEETUP_CASH_COMPLETED", "COD_DELIVERED"] as EscrowStatus[] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  // ── Activity counts ─────────────────────────────────────────────────────
  const [itemCount, activeItemCount, soldItemCount, buyOrderCount, sellOrderCount, disputeCount, cancelledCount] =
    await Promise.all([
      prisma.item.count({ where: { sellerId: userId } }),
      prisma.item.count({ where: { sellerId: userId, status: { in: ["ACTIVE", "APPROVED"] as ItemStatus[] } } }),
      prisma.item.count({ where: { sellerId: userId, status: "SOLD" } }),
      prisma.escrowOrder.count({ where: { buyerId: userId } }),
      prisma.escrowOrder.count({ where: { sellerId: userId } }),
      prisma.dispute.count({ where: { reporterId: userId } }),
      prisma.escrowOrder.count({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
          status: { in: ["CANCELLED", "CANCELLED_BY_ADMIN"] as EscrowStatus[] },
        },
      }),
    ]);

  // ── Active escrow orders ────────────────────────────────────────────────
  const escrowOrders = await prisma.escrowOrder.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      status: {
        notIn: ["COMPLETED", "CANCELLED", "REFUNDED", "CANCELLED_BY_ADMIN",
                "MEETUP_CASH_COMPLETED", "COD_DELIVERED"] as EscrowStatus[],
      },
    },
    select: {
      id: true, amount: true, totalAmount: true, sellerPayout: true,
      status: true, buyerId: true, sellerId: true, createdAt: true,
      item: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    verifiedAt: user.verifiedAt?.toISOString() ?? null,
    buyerEscrowTotal:    buyerEscrow._sum.amount ?? 0,
    buyerEscrowCount:    buyerEscrow._count._all,
    sellerPayoutTotal:   sellerPayout._sum.amount ?? 0,
    sellerPayoutCount:   sellerPayout._count._all,
    totalSalesAmount:    totalSales._sum.amount ?? 0,
    totalSalesCount:     totalSales._count._all,
    totalPurchaseAmount: totalPurchases._sum.amount ?? 0,
    totalPurchaseCount:  totalPurchases._count._all,
    itemCount, activeItemCount, soldItemCount,
    buyOrderCount, sellOrderCount, disputeCount, cancelledCount,
    escrowOrders: escrowOrders.map((o) => ({
      id: o.id,
      amount: o.amount,
      totalAmount: o.totalAmount,
      sellerPayout: o.sellerPayout,
      status: o.status,
      buyerId: o.buyerId,
      sellerId: o.sellerId,
      itemTitle: o.item.title,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

// ─── adminEditUser ────────────────────────────────────────────────────────────

const AdminEditUserSchema = z.object({
  userId:             z.string().min(1),
  name:               z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร").max(50),
  phone:              z.string().regex(/^0\d{9}$/).nullable().optional(),
  role:               z.enum(["ADMIN", "STUDENT"]),
  isBanned:           z.boolean(),
  trustScore:         z.number().min(0).max(200),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"]),
  adminNote:          z.string().max(500).optional(),
});

export async function adminEditUser(
  input: z.infer<typeof AdminEditUserSchema>
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = AdminEditUserSchema.parse(input);

    // Safety guards
    if (parsed.userId === admin.id && parsed.role !== "ADMIN") {
      return { success: false, error: "ไม่สามารถเปลี่ยนบทบาทของตัวเองได้" };
    }
    if (parsed.userId === admin.id && parsed.isBanned) {
      return { success: false, error: "ไม่สามารถแบนตัวเองได้" };
    }

    await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        name:               parsed.name,
        phone:              parsed.phone || null,
        role:               parsed.role,
        isBanned:           parsed.isBanned,
        bannedAt:           parsed.isBanned ? new Date() : null,
        trustScore:         parsed.trustScore,
        verificationStatus: parsed.verificationStatus as any,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว" };
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0].message };
    }
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
