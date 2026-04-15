"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { LendingCategory, RentalType, ItemCondition, LendingItemStatus } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LendingItemCreateInput {
  title: string;
  description?: string;
  category: LendingCategory;
  condition: ItemCondition;
  images: string[];          // uploaded URLs
  tags: string[];
  rentalType: RentalType;
  dailyRate?: number;
  flatFee?: number;
  depositAmount: number;
  lateFeePerDay?: number;
  maxLendingDays: number;
  minLendingDays: number;
  isRenewable: boolean;
  maxRenewals: number;
  allowMeetup: boolean;
  meetupLocations: string[];
}

export type LendingItemWithOwner = {
  id: string;
  title: string;
  description: string | null;
  category: LendingCategory;
  condition: ItemCondition;
  images: string[];
  tags: string[];
  rentalType: RentalType;
  dailyRate: number | null;
  flatFee: number | null;
  depositAmount: number;
  lateFeePerDay: number;
  maxLendingDays: number;
  minLendingDays: number;
  isRenewable: boolean;
  maxRenewals: number;
  status: LendingItemStatus;
  allowMeetup: boolean;
  meetupLocations: string[];
  totalLentCount: number;
  viewCount: number;
  averageRating: number | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
    lendingTier: string;
    lenderRating: number | null;
    verificationStatus: string;
  };
};

// ─── Browse public items ──────────────────────────────────────────────────────

export async function browseLendingItems(params?: {
  q?: string;
  category?: string;
  rentalType?: string;
  maxDeposit?: number;
}): Promise<LendingItemWithOwner[]> {
  const { q, category, rentalType, maxDeposit } = params ?? {};

  const where: any = { status: "AVAILABLE" };

  if (q?.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { description: { contains: q.trim(), mode: "insensitive" } },
      { tags: { has: q.trim().toLowerCase() } },
    ];
  }
  if (category && category !== "ALL") where.category = category;
  if (rentalType && rentalType !== "ALL") where.rentalType = rentalType;
  if (maxDeposit) where.depositAmount = { lte: maxDeposit };

  const items = await prisma.lendingItem.findMany({
    where,
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: 60,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
          lendingTier: true,
          lenderRating: true,
          verificationStatus: true,
        },
      },
    },
  });

  return items.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
  })) as LendingItemWithOwner[];
}

// ─── Single item detail ───────────────────────────────────────────────────────

export async function getLendingItemDetail(id: string): Promise<LendingItemWithOwner | null> {
  const item = await prisma.lendingItem.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
          lendingTier: true,
          lenderRating: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!item) return null;

  // increment view count
  await prisma.lendingItem.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return { ...item, createdAt: item.createdAt.toISOString() } as LendingItemWithOwner;
}

// ─── Create lending item ──────────────────────────────────────────────────────

export async function createLendingItem(
  input: LendingItemCreateInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  if (user.verificationStatus !== "APPROVED")
    return { success: false, error: "คุณต้องยืนยัน KYC ก่อนลงรายการให้ยืม" };

  if (!input.title.trim()) return { success: false, error: "กรุณาใส่ชื่อสินค้า" };
  if (input.images.length === 0) return { success: false, error: "กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป" };
  if (input.rentalType === "DAILY_RATE" && (!input.dailyRate || input.dailyRate <= 0))
    return { success: false, error: "กรุณาระบุค่าเช่าต่อวัน" };
  if (input.rentalType === "FLAT_FEE" && (!input.flatFee || input.flatFee <= 0))
    return { success: false, error: "กรุณาระบุค่าเช่าเหมา" };

  const item = await prisma.lendingItem.create({
    data: {
      ownerId: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      condition: input.condition,
      images: input.images,
      tags: input.tags,
      rentalType: input.rentalType,
      dailyRate: input.rentalType === "DAILY_RATE" ? input.dailyRate : null,
      flatFee: input.rentalType === "FLAT_FEE" ? input.flatFee : null,
      depositAmount: input.depositAmount,
      lateFeePerDay: input.lateFeePerDay ?? 0,
      maxLendingDays: input.maxLendingDays,
      minLendingDays: input.minLendingDays,
      isRenewable: input.isRenewable,
      maxRenewals: input.maxRenewals,
      allowMeetup: input.allowMeetup,
      meetupLocations: input.meetupLocations,
    },
  });

  revalidatePath("/lending");
  revalidatePath("/lending/my-items");

  return { success: true, id: item.id };
}

// ─── Update lending item ──────────────────────────────────────────────────────

export async function updateLendingItem(
  id: string,
  input: Partial<LendingItemCreateInput>
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const item = await prisma.lendingItem.findUnique({ where: { id }, select: { ownerId: true } });
  if (!item) return { success: false, error: "ไม่พบรายการ" };
  if (item.ownerId !== user.id) return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" };

  await prisma.lendingItem.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.condition && { condition: input.condition }),
      ...(input.images && { images: input.images }),
      ...(input.tags && { tags: input.tags }),
      ...(input.depositAmount !== undefined && { depositAmount: input.depositAmount }),
      ...(input.lateFeePerDay !== undefined && { lateFeePerDay: input.lateFeePerDay }),
      ...(input.maxLendingDays && { maxLendingDays: input.maxLendingDays }),
      ...(input.meetupLocations && { meetupLocations: input.meetupLocations }),
    },
  });

  revalidatePath(`/lending/${id}`);
  revalidatePath("/lending/my-items");

  return { success: true };
}

// ─── Toggle availability ──────────────────────────────────────────────────────

export async function toggleLendingItemAvailability(
  id: string
): Promise<{ success: boolean; error?: string; newStatus?: LendingItemStatus }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const item = await prisma.lendingItem.findUnique({
    where: { id },
    select: { ownerId: true, status: true },
  });
  if (!item) return { success: false, error: "ไม่พบรายการ" };
  if (item.ownerId !== user.id) return { success: false, error: "คุณไม่มีสิทธิ์" };
  if (item.status === "LENT_OUT" || item.status === "SUSPENDED")
    return { success: false, error: "ไม่สามารถเปลี่ยนสถานะได้ในขณะนี้" };

  const newStatus: LendingItemStatus =
    item.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";

  await prisma.lendingItem.update({ where: { id }, data: { status: newStatus } });
  revalidatePath("/lending/my-items");
  revalidatePath(`/lending/${id}`);

  return { success: true, newStatus };
}

// ─── Delete lending item ──────────────────────────────────────────────────────

export async function deleteLendingItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const item = await prisma.lendingItem.findUnique({
    where: { id },
    select: { ownerId: true, status: true },
  });
  if (!item) return { success: false, error: "ไม่พบรายการ" };
  if (item.ownerId !== user.id && user.role !== "ADMIN")
    return { success: false, error: "คุณไม่มีสิทธิ์ลบรายการนี้" };
  if (item.status === "LENT_OUT")
    return { success: false, error: "ไม่สามารถลบได้ขณะที่ของกำลังถูกยืม" };

  await prisma.lendingItem.delete({ where: { id } });
  revalidatePath("/lending");
  revalidatePath("/lending/my-items");

  return { success: true };
}

// ─── My listed items ──────────────────────────────────────────────────────────

export async function getMyLendingItems(): Promise<LendingItemWithOwner[]> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return [];

  const items = await prisma.lendingItem.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
          lendingTier: true,
          lenderRating: true,
          verificationStatus: true,
        },
      },
    },
  });

  return items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })) as LendingItemWithOwner[];
}

// Display label constants live in @/lib/constants/lending — import from there.
