"use server";

import { z }               from "zod";
import { auth }            from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { revalidatePath }  from "next/cache";
import type { ActionResult, PaginatedResponse, TableQueryParams, ItemRow } from "../_lib/types";
import { paginationMeta }  from "../_lib/utils";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

// ─── getItems ─────────────────────────────────────────────────────────────────

type GetItemsParams = TableQueryParams & {
  status?:      string;
  listingType?: string;
};

export async function getItems(
  params: GetItemsParams
): Promise<PaginatedResponse<ItemRow>> {
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
      { title:  { contains: search, mode: "insensitive" } },
      { seller: { name:  { contains: search, mode: "insensitive" } } },
      { seller: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const validStatuses = [
    "ACTIVE","SOLD","RENTED","EXPIRED","REMOVED",
    "PENDING","APPROVED","REJECTED","UNAVAILABLE",
  ];
  if (params.status && validStatuses.includes(params.status)) {
    where.status = params.status;
  }

  if (params.listingType === "SELL" || params.listingType === "RENT") {
    where.listingType = params.listingType;
  }

  const orderBy = { [sortBy]: sortOrder };

  const [items, totalCount] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        seller: { select: { id: true, name: true, email: true } },
        category: { select: { nameTh: true } },
        images: { where: { isMain: true }, take: 1 },
      },
    }),
    prisma.item.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id:           item.id,
      title:        item.title,
      thumbnailUrl: item.images[0]?.url ?? null,
      seller:       item.seller,
      price:        item.price,
      category:     item.category?.nameTh ?? null,
      status:       item.status,
      listingType:  item.listingType,
      createdAt:    item.createdAt.toISOString(),
      rejectReason: item.rejectReason ?? null,
    })),
    meta: paginationMeta(totalCount, page, pageSize),
  };
}

// ─── approveItem ──────────────────────────────────────────────────────────────

const IdSchema = z.object({ id: z.string().min(1) });

export async function approveItem(itemId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id } = IdSchema.parse({ id: itemId });
    await prisma.item.update({
      where: { id },
      data:  { status: "APPROVED", rejectReason: null },
    });
    revalidatePath("/admin/items");
    revalidatePath("/admin/approvals");
    return { success: true, message: "อนุมัติสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── rejectItem ───────────────────────────────────────────────────────────────

const RejectSchema = z.object({
  id:     z.string().min(1),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500),
});

export async function rejectItem(
  itemId: string,
  reason: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = RejectSchema.parse({ id: itemId, reason });
    await prisma.item.update({
      where: { id: parsed.id },
      data:  { status: "REJECTED", rejectReason: parsed.reason },
    });
    revalidatePath("/admin/items");
    revalidatePath("/admin/approvals");
    return { success: true, message: "ปฏิเสธสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── forceDeleteItem ──────────────────────────────────────────────────────────

export async function forceDeleteItem(itemId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id } = IdSchema.parse({ id: itemId });
    // Mark as REMOVED rather than hard-delete to preserve order history
    await prisma.item.update({
      where: { id },
      data:  { status: "REMOVED" },
    });
    revalidatePath("/admin/items");
    return { success: true, message: "ลบสินค้าเรียบร้อยแล้ว" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
