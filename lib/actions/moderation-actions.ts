"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Get My Items (Seller) ───────────────────────────

export async function getMyItems() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const items = await prisma.item.findMany({
    where: { sellerId: session.user.id },
    include: {
      category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
      images: { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = items.map((item) => ({
    ...item,
    createdAt:             item.createdAt.toISOString(),
    updatedAt:             item.updatedAt.toISOString(),
    scheduledForDeletionAt: item.scheduledForDeletionAt?.toISOString() ?? null,
  }));

  return { items: serialized };
}

// ─── Get Pending Items (Admin) ───────────────────────

export async function getPendingItems() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if ((session.user as any).role !== "ADMIN") return { error: "Not authorized" };

  const items = await prisma.item.findMany({
    where: { status: "PENDING" },
    include: {
      seller: { select: { id: true, name: true, email: true, image: true } },
      category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
      images: { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return { items: serialized };
}

// ─── Approve Item (Admin) ────────────────────────────

export async function approveItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if ((session.user as any).role !== "ADMIN") return { error: "Not authorized" };

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };

  await prisma.item.update({
    where: { id: itemId },
    data: { status: "APPROVED", rejectReason: null },
  });

  // Notify seller
  await prisma.notification.create({
    data: {
      userId: item.sellerId,
      type: "MODERATION",
      message: `สินค้า "${item.title}" ได้รับการอนุมัติแล้ว 🎉`,
      link: "/dashboard/my-items",
    },
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/");
  return { success: true };
}

// ─── Reject Item (Admin) ─────────────────────────────

export async function rejectItem(itemId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if ((session.user as any).role !== "ADMIN") return { error: "Not authorized" };

  if (!reason.trim()) return { error: "Rejection reason is required" };

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };

  await prisma.item.update({
    where: { id: itemId },
    data: { status: "REJECTED", rejectReason: reason.trim() },
  });

  // Notify seller
  await prisma.notification.create({
    data: {
      userId: item.sellerId,
      type: "MODERATION",
      message: `สินค้า "${item.title}" ถูกปฏิเสธ: ${reason.trim()}`,
      link: "/dashboard/my-items",
    },
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/");
  return { success: true };
}

// ─── Update Item (Seller edit → resets to PENDING) ───

export async function updateItem(
  itemId: string,
  data: {
    title: string;
    price: number;
    description: string;
    /** IDs of existing ItemImage rows the seller chose to keep */
    keepImageIds: string[];
    /** Public URLs returned by /api/upload for newly added images */
    newImageUrls: string[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };
  if (item.sellerId !== session.user.id) return { error: "Not authorized" };

  if (!data.title.trim()) return { error: "Title is required" };
  if (data.price <= 0) return { error: "Price must be greater than 0" };

  // ── 1. Update core fields ──────────────────────────
  await prisma.item.update({
    where: { id: itemId },
    data: {
      title: data.title.trim(),
      price: data.price,
      description: data.description.trim(),
      status: "PENDING",
      rejectReason: null,
    },
  });

  // ── 2. Delete removed images ───────────────────────
  // Any ItemImage row for this item whose id is NOT in keepImageIds gets deleted.
  await prisma.itemImage.deleteMany({
    where: {
      itemId,
      id: { notIn: data.keepImageIds },
    },
  });

  // ── 3. Insert new images ───────────────────────────
  if (data.newImageUrls.length > 0) {
    // Determine the starting order index after kept images
    const kept = await prisma.itemImage.findMany({
      where: { itemId },
      orderBy: { order: "asc" },
      select: { order: true },
    });
    const nextOrder = kept.length > 0 ? Math.max(...kept.map((r) => r.order)) + 1 : 0;

    await prisma.itemImage.createMany({
      data: data.newImageUrls.map((url, i) => ({
        itemId,
        url,
        isMain: false,
        order: nextOrder + i,
      })),
    });
  }

  // ── 4. Ensure exactly one isMain ──────────────────
  const allImages = await prisma.itemImage.findMany({
    where: { itemId },
    orderBy: { order: "asc" },
  });

  if (allImages.length > 0) {
    // Reset all, then promote the first (lowest order) to main
    await prisma.itemImage.updateMany({ where: { itemId }, data: { isMain: false } });
    await prisma.itemImage.update({
      where: { id: allImages[0].id },
      data: { isMain: true },
    });
  }

  revalidatePath("/dashboard/my-items");
  revalidatePath("/admin/approvals");
  revalidatePath("/");
  return { success: true };
}

// ─── Get Single Item for Edit (Seller) ───────────────

export async function getItemForEdit(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
      images: { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" } },
    },
  });

  if (!item) return { error: "Item not found" };
  if (item.sellerId !== session.user.id) return { error: "Not authorized" };

  return {
    item: {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    },
  };
}
