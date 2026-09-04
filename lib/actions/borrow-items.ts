"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOffice, currentUser } from "@/lib/permissions";
import type { LendingCategory, ItemCondition, LendingItemStatus } from "@prisma/client";

/**
 * The งานภัทร asset register.
 *
 * One row is one physical object with its own asset tag, not "calculator ×10" —
 * that is how the university tracks equipment, and it means the existing
 * AVAILABLE / LENT_OUT statuses do the work with no stock counting anywhere.
 */

export type ActionResult =
  | { success: true;  message: string; id?: string }
  | { success: false; error: string };

// ─── Public catalogue ─────────────────────────────────────────────────────────

export interface CatalogueItem {
  id:          string;
  title:       string;
  description: string | null;
  category:    string;
  condition:   string;
  status:      string;
  images:      string[];
  maxDays:     number;
  assetTag:    string | null;
  totalLent:   number;
  officeName:  string | null;
}

export async function getBorrowCatalogue(opts?: {
  category?: string;
  search?:   string;
  onlyAvailable?: boolean;
}): Promise<CatalogueItem[]> {
  const where: Record<string, unknown> = {
    // SUSPENDED and UNAVAILABLE are the office's way of taking something off
    // the shelf, so they never reach the catalogue.
    status: opts?.onlyAvailable
      ? "AVAILABLE"
      : { in: ["AVAILABLE", "RESERVED", "LENT_OUT"] as LendingItemStatus[] },
  };

  if (opts?.category && opts.category !== "all") where.category = opts.category;
  if (opts?.search?.trim()) {
    where.OR = [
      { title:       { contains: opts.search.trim(), mode: "insensitive" } },
      { description: { contains: opts.search.trim(), mode: "insensitive" } },
    ];
  }

  const items = await prisma.lendingItem.findMany({
    where: where as never,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 120,
    select: {
      id: true, title: true, description: true, category: true, condition: true,
      status: true, images: true, maxLendingDays: true, assetTag: true,
      totalLentCount: true,
      owner: { select: { officeName: true, name: true } },
    },
  });

  return items.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    condition: i.condition,
    status: i.status,
    images: i.images,
    maxDays: i.maxLendingDays,
    assetTag: i.assetTag,
    totalLent: i.totalLentCount,
    officeName: i.owner.officeName ?? i.owner.name,
  }));
}

export async function getBorrowItem(id: string) {
  const item = await prisma.lendingItem.findUnique({
    where: { id },
    select: {
      id: true, title: true, description: true, category: true, condition: true,
      status: true, images: true, tags: true, assetTag: true,
      maxLendingDays: true, minLendingDays: true,
      isRenewable: true, maxRenewals: true, totalLentCount: true,
      meetupLocations: true, createdAt: true,
      owner: {
        select: {
          id: true, name: true, image: true,
          officeName: true, officeDescription: true,
          officeLocation: true, officeHours: true,
        },
      },
    },
  });
  if (!item) return null;

  const me = await currentUser();

  // Whether *this* visitor already has a live request on this item, so the
  // page can say "you already asked for this" instead of letting them ask twice.
  let alreadyRequested = false;
  if (me) {
    const open = await prisma.lendingOrder.count({
      where: {
        lendingItemId: id,
        borrowerId: me.id,
        status: { notIn: ["COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED", "CANCELLED", "LOST"] },
      },
    });
    alreadyRequested = open > 0;
  }

  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    alreadyRequested,
    viewerRole: me?.role ?? null,
    signedIn: !!me,
  };
}

/** Headline figures for the catalogue page — real counts, never placeholders. */
export async function getBorrowStats() {
  const [total, available, out, completed] = await Promise.all([
    prisma.lendingItem.count(),
    prisma.lendingItem.count({ where: { status: "AVAILABLE" } }),
    prisma.lendingItem.count({ where: { status: "LENT_OUT" } }),
    prisma.lendingOrder.count({
      where: { status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] } },
    }),
  ]);
  return { total, available, out, completed };
}

// ─── Office-side management ───────────────────────────────────────────────────

const ItemSchema = z.object({
  title:           z.string().trim().min(2, "ชื่ออุปกรณ์สั้นเกินไป").max(120),
  description:     z.string().trim().max(2000).optional().or(z.literal("")),
  category:        z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  condition:       z.enum(["LIKE_NEW", "GOOD", "FAIR", "NEEDS_REPAIR"]),
  images:          z.array(z.string()).max(8).default([]),
  assetTag:        z.string().trim().max(60).optional().or(z.literal("")),
  maxLendingDays:  z.number().int().min(1).max(180),
  minLendingDays:  z.number().int().min(1).max(180),
  isRenewable:     z.boolean(),
  maxRenewals:     z.number().int().min(0).max(5),
  meetupLocations: z.array(z.string()).max(5).default([]),
  purchasePrice:   z.number().min(0).nullable().optional(),
  fundEntryId:     z.string().nullable().optional(),
});

export type ItemInput = z.infer<typeof ItemSchema>;

export async function createBorrowItem(input: ItemInput): Promise<ActionResult> {
  try {
    const staff  = await requireOffice();
    const parsed = ItemSchema.parse(input);

    if (parsed.minLendingDays > parsed.maxLendingDays) {
      return { success: false, error: "จำนวนวันขั้นต่ำต้องไม่มากกว่าขั้นสูงสุด" };
    }

    if (parsed.assetTag) {
      const clash = await prisma.lendingItem.findUnique({
        where: { assetTag: parsed.assetTag }, select: { id: true },
      });
      if (clash) return { success: false, error: "รหัสครุภัณฑ์นี้ถูกใช้ไปแล้ว" };
    }

    const item = await prisma.lendingItem.create({
      data: {
        ownerId:         staff.id,
        title:           parsed.title,
        description:     parsed.description || null,
        category:        parsed.category as LendingCategory,
        condition:       parsed.condition as ItemCondition,
        images:          parsed.images,
        assetTag:        parsed.assetTag || null,
        maxLendingDays:  parsed.maxLendingDays,
        minLendingDays:  parsed.minLendingDays,
        isRenewable:     parsed.isRenewable,
        maxRenewals:     parsed.maxRenewals,
        meetupLocations: parsed.meetupLocations,
        purchasePrice:   parsed.purchasePrice ?? null,
        purchasedAt:     parsed.purchasePrice != null ? new Date() : null,
        fundEntryId:     parsed.fundEntryId || null,
        status:          "AVAILABLE",
      },
      select: { id: true },
    });

    revalidatePath("/pattara/items");
    revalidatePath("/borrow");
    return { success: true, message: "เพิ่มอุปกรณ์เรียบร้อยแล้ว", id: item.id };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0].message };
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function updateBorrowItem(id: string, input: ItemInput): Promise<ActionResult> {
  try {
    await requireOffice();
    const parsed = ItemSchema.parse(input);

    if (parsed.assetTag) {
      const clash = await prisma.lendingItem.findUnique({
        where: { assetTag: parsed.assetTag }, select: { id: true },
      });
      if (clash && clash.id !== id) {
        return { success: false, error: "รหัสครุภัณฑ์นี้ถูกใช้ไปแล้ว" };
      }
    }

    await prisma.lendingItem.update({
      where: { id },
      data: {
        title:           parsed.title,
        description:     parsed.description || null,
        category:        parsed.category as LendingCategory,
        condition:       parsed.condition as ItemCondition,
        images:          parsed.images,
        assetTag:        parsed.assetTag || null,
        maxLendingDays:  parsed.maxLendingDays,
        minLendingDays:  parsed.minLendingDays,
        isRenewable:     parsed.isRenewable,
        maxRenewals:     parsed.maxRenewals,
        meetupLocations: parsed.meetupLocations,
        purchasePrice:   parsed.purchasePrice ?? null,
      },
    });

    revalidatePath("/pattara/items");
    revalidatePath(`/borrow/${id}`);
    revalidatePath("/borrow");
    return { success: true, message: "บันทึกการแก้ไขแล้ว" };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0].message };
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

/**
 * Takes an item off the shelf, or puts it back.
 *
 * Refuses while somebody is holding it — an item cannot be both lent out and
 * withdrawn, and pretending otherwise loses track of a real object.
 */
export async function setBorrowItemStatus(
  id: string,
  status: "AVAILABLE" | "SUSPENDED" | "UNAVAILABLE",
): Promise<ActionResult> {
  try {
    await requireOffice();

    const item = await prisma.lendingItem.findUnique({
      where: { id }, select: { status: true, title: true },
    });
    if (!item) return { success: false, error: "ไม่พบอุปกรณ์นี้" };

    if (item.status === "LENT_OUT" || item.status === "RESERVED") {
      return { success: false, error: "อุปกรณ์นี้กำลังถูกยืมหรือถูกจองอยู่ ยังเปลี่ยนสถานะไม่ได้" };
    }

    await prisma.lendingItem.update({ where: { id }, data: { status } });

    revalidatePath("/pattara/items");
    revalidatePath("/borrow");
    return { success: true, message: `อัปเดตสถานะ "${item.title}" แล้ว` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function deleteBorrowItem(id: string): Promise<ActionResult> {
  try {
    await requireOffice();

    const orders = await prisma.lendingOrder.count({ where: { lendingItemId: id } });
    if (orders > 0) {
      // History is the point of an asset register — an item that has been lent
      // is withdrawn, never erased.
      return {
        success: false,
        error: "อุปกรณ์นี้มีประวัติการยืมแล้ว ลบไม่ได้ — ใช้ “พักการให้ยืม” แทน",
      };
    }

    await prisma.lendingItem.delete({ where: { id } });
    revalidatePath("/pattara/items");
    revalidatePath("/borrow");
    return { success: true, message: "ลบอุปกรณ์แล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

/** Everything in the register, for the office's own list. */
export async function getOfficeItems() {
  await requireOffice();

  const items = await prisma.lendingItem.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, category: true, condition: true, status: true,
      images: true, assetTag: true, totalLentCount: true, purchasePrice: true,
      maxLendingDays: true, minLendingDays: true, isRenewable: true,
      maxRenewals: true, meetupLocations: true, description: true,
      createdAt: true,
      lendingOrders: {
        where: { status: { in: ["ITEM_HANDED_OVER", "ACTIVE", "OVERDUE", "RENEWED", "RETURN_REQUESTED", "RETURN_SCHEDULED"] } },
        select: { id: true, dueDate: true, borrower: { select: { name: true } } },
        take: 1,
      },
    },
  });

  return items.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
    heldBy:    i.lendingOrders[0]?.borrower.name ?? null,
    dueDate:   i.lendingOrders[0]?.dueDate?.toISOString() ?? null,
    openOrderId: i.lendingOrders[0]?.id ?? null,
    lendingOrders: undefined,
  }));
}
