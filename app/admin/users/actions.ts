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
