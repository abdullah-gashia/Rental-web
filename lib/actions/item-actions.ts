"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Create Item ─────────────────────────────────────

interface CreateItemInput {
  title: string;
  description: string;
  price: number;
  listingType: "SELL" | "RENT";
  condition: "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR";
  categorySlug: string;
  location?: string;
  contact?: string;
  negotiable?: boolean;
  shippable?: boolean;
}

export async function createItem(data: CreateItemInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const category = await prisma.category.findUnique({
    where: { slug: data.categorySlug },
  });

  if (!category) {
    return { error: "Invalid category" };
  }

  const item = await prisma.item.create({
    data: {
      title: data.title,
      description: data.description,
      price: data.price,
      listingType: data.listingType,
      condition: data.condition,
      status: "PENDING", // explicit — do not rely on DB default alone
      location: data.location || null,
      contact: data.contact || null,
      negotiable: data.negotiable || false,
      shippable: data.shippable || false,
      sellerId: session.user.id,
      categoryId: category.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/my-items");
  revalidatePath("/admin/approvals");
  return { success: true, itemId: item.id };
}

// ─── Toggle Wishlist ─────────────────────────────────

export async function toggleWishlist(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_itemId: {
        userId: session.user.id,
        itemId,
      },
    },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return { added: false };
  } else {
    await prisma.wishlist.create({
      data: { userId: session.user.id, itemId },
    });
    return { added: true };
  }
}

// ─── Delete Item ─────────────────────────────────────
//
// Seller path  → soft delete: sets scheduledForDeletionAt = now().
//   The item remains visible on the storefront for 24 hours with a
//   warning banner, giving active buyers time to react.
//   The seller can cancel within that window via cancelDeletion().
//
// Admin path → hard delete: immediately sets status = UNAVAILABLE.
//   Admins have no reason to use the grace period (anti-fraud tool
//   is specifically for sellers trying to vanish mid-transaction).

export async function deleteItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };

  const isAdmin  = (session.user as any).role === "ADMIN";
  const isSeller = item.sellerId === session.user.id;

  if (!isSeller && !isAdmin) {
    return { error: "Not authorized" };
  }

  if (isAdmin) {
    // Hard delete — instant
    await prisma.item.update({
      where: { id: itemId },
      data: { status: "UNAVAILABLE" },
    });
  } else {
    // Soft delete — 24-hour grace period
    await prisma.item.update({
      where: { id: itemId },
      data: { scheduledForDeletionAt: new Date() },
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard/my-items");
  return { success: true };
}

// ─── Cancel Scheduled Deletion ───────────────────────
//
// Seller-only: clears scheduledForDeletionAt, restoring the item
// to its current status with no deletion pending.

export async function cancelDeletion(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };
  if (item.sellerId !== session.user.id) {
    return { error: "Not authorized" }; // admins cannot cancel a seller's deletion
  }

  // Only allow cancel if the grace period has not already expired
  if (item.scheduledForDeletionAt) {
    const expiry = new Date(item.scheduledForDeletionAt.getTime() + 24 * 60 * 60 * 1000);
    if (expiry < new Date()) {
      return { error: "Grace period has already expired — item cannot be restored" };
    }
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { scheduledForDeletionAt: null },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/my-items");
  return { success: true };
}
