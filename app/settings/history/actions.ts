"use server";

import { auth }          from "@/lib/auth";
import { prisma }        from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("กรุณาเข้าสู่ระบบ");
  return session.user.id;
}

// ─── getUserHistory ───────────────────────────────────────────────────────────

export async function getUserHistory(page = 1, pageSize = 20) {
  const userId = await requireUser();
  const skip   = (page - 1) * pageSize;

  const [interactions, total] = await Promise.all([
    prisma.userInteraction.findMany({
      where:   { userId, type: "VIEW" },
      orderBy: { createdAt: "desc" },
      skip,
      take:    pageSize,
      include: {
        item: {
          select: {
            id: true, title: true, price: true, emoji: true, color: true,
            category: { select: { nameTh: true } },
            images:   { where: { isMain: true }, take: 1, select: { url: true } },
          },
        },
      },
    }),
    prisma.userInteraction.count({ where: { userId, type: "VIEW" } }),
  ]);

  return {
    interactions: interactions.map((ix) => ({
      id:           ix.id,
      createdAt:    ix.createdAt.toISOString(),
      category:     ix.category,
      item: {
        id:           ix.item.id,
        title:        ix.item.title,
        price:        ix.item.price,
        emoji:        ix.item.emoji,
        thumbnailUrl: ix.item.images[0]?.url ?? null,
        categoryTh:   ix.item.category.nameTh,
      },
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── deleteInteraction ────────────────────────────────────────────────────────

export async function deleteInteraction(interactionId: string) {
  try {
    const userId = await requireUser();
    await prisma.userInteraction.delete({
      where: { id: interactionId, userId }, // userId guard prevents deleting others'
    });
    revalidatePath("/settings/history");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── clearAllHistory ──────────────────────────────────────────────────────────

export async function clearAllHistory() {
  try {
    const userId = await requireUser();
    await prisma.userInteraction.deleteMany({ where: { userId } });
    revalidatePath("/settings/history");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── toggleTracking ───────────────────────────────────────────────────────────

export async function toggleTracking(enabled: boolean) {
  try {
    const userId = await requireUser();
    await prisma.user.update({
      where: { id: userId },
      data:  { trackingEnabled: enabled },
    });
    revalidatePath("/settings/history");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── getTrackingPreference ────────────────────────────────────────────────────

export async function getTrackingPreference() {
  const userId = await requireUser();
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { trackingEnabled: true },
  });
  return { trackingEnabled: user?.trackingEnabled ?? true };
}
