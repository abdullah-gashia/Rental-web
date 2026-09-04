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
        // Ratings come back as raw rows and are averaged below: Prisma cannot
        // aggregate a relation inside findMany, and the page size is 20.
        reviewsReceived: { select: { rating: true } },
        _count: {
          select: {
            items:              true,
            escrowOrdersBuying: true,
            reportsReceived:    { where: { status: "OPEN" } },
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
      avgRating:  u.reviewsReceived.length > 0
        ? u.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / u.reviewsReceived.length
        : null,
      reviewCount:     u.reviewsReceived.length,
      openReportCount: u._count.reportsReceived,
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
import { sendAdminMessageEmail } from "@/lib/email";

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

  // ── Reputation and abuse reports ────────────────────────────────────────
  const [ratingAgg, reviewRows, reportRows, openReportCount] = await Promise.all([
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.findMany({
      where: { revieweeId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        reviewer: { select: { id: true, name: true } },
        order:    { select: { item: { select: { title: true } } } },
      },
    }),
    prisma.report.findMany({
      where: { reportedId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, reason: true, category: true, status: true,
        adminNote: true, createdAt: true, reviewedAt: true,
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.report.count({ where: { reportedId: userId, status: "OPEN" } }),
  ]);

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    verifiedAt: user.verifiedAt?.toISOString() ?? null,
    avgRating:   ratingAgg._avg.rating ?? null,
    reviewCount: ratingAgg._count.rating,
    reviews: reviewRows.map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reviewer: r.reviewer,
      itemTitle: r.order?.item.title ?? null,
    })),
    reports: reportRows.map((r) => ({
      id: r.id, reason: r.reason, category: r.category,
      status: r.status, adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reporter: r.reporter,
    })),
    openReportCount,
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

// ─── adjustTrustScore ─────────────────────────────────────────────────────────

/** Nudges a user's trust score by a delta, clamped to the 0–200 range. */
export async function adjustTrustScore(userId: string, delta: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, error: "ค่าที่ปรับต้องไม่เป็นศูนย์" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }, select: { trustScore: true },
    });
    if (!user) return { success: false, error: "ไม่พบผู้ใช้" };

    const next = Math.max(0, Math.min(200, user.trustScore + Math.round(delta)));

    await prisma.user.update({ where: { id: userId }, data: { trustScore: next } });

    revalidatePath("/admin/users");
    return { success: true, message: `ปรับคะแนนเป็น ${next} แล้ว` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── deleteUserReview ─────────────────────────────────────────────────────────

/**
 * Removes one review.
 *
 * This is how an admin takes stars away: the displayed rating is the mean of
 * real reviews, so deleting an unfair one changes it honestly. There is no
 * separate "admin star adjustment" because a fabricated average would mislead
 * every shopper who reads it.
 */
export async function deleteUserReview(reviewId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const review = await prisma.review.findUnique({
      where: { id: reviewId }, select: { revieweeId: true },
    });
    if (!review) return { success: false, error: "ไม่พบรีวิวนี้" };

    await prisma.review.delete({ where: { id: reviewId } });

    revalidatePath("/admin/users");
    revalidatePath(`/user/${review.revieweeId}`);
    return { success: true, message: "ลบรีวิวเรียบร้อยแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── setReportStatus ──────────────────────────────────────────────────────────

export async function setReportStatus(
  reportId: string,
  status: "OPEN" | "REVIEWED" | "DISMISSED",
  adminNote?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        adminNote:  adminNote?.trim() || null,
        reviewedAt: status === "OPEN" ? null : new Date(),
      },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "อัปเดตสถานะรายงานแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── sendUserEmail ────────────────────────────────────────────────────────────

/** Sends an admin-written message to one user's registered e-mail address. */
export async function sendUserEmail(
  userId: string,
  subject: string,
  body: string,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    if (!subject.trim()) return { success: false, error: "กรุณาใส่หัวข้ออีเมล" };
    if (!body.trim())    return { success: false, error: "กรุณาใส่เนื้อหาอีเมล" };

    const user = await prisma.user.findUnique({
      where: { id: userId }, select: { email: true, name: true },
    });
    if (!user?.email) return { success: false, error: "ผู้ใช้รายนี้ไม่มีอีเมล" };

    const res = await sendAdminMessageEmail({
      to:        user.email,
      subject:   subject.trim(),
      body:      body.trim(),
      adminName: admin.name ?? "ผู้ดูแลระบบ",
    });

    if (!res.sent) {
      return { success: false, error: `ส่งอีเมลไม่สำเร็จ: ${res.reason}` };
    }

    // Mirrored in-app so the user sees it even if the mail is filtered
    await prisma.notification.create({
      data: {
        userId,
        type:    "SYSTEM",
        message: `ข้อความจากผู้ดูแลระบบ: ${subject.trim()}`,
        link:    "/settings",
      },
    });

    return { success: true, message: `ส่งอีเมลถึง ${user.email} แล้ว` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
