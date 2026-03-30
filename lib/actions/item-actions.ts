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
      location: data.location || null,
      contact: data.contact || null,
      negotiable: data.negotiable || false,
      shippable: data.shippable || false,
      sellerId: session.user.id,
      categoryId: category.id,
    },
  });

  revalidatePath("/");
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

export async function deleteItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });

  if (!item) return { error: "Item not found" };
  if (item.sellerId !== session.user.id && (session.user as any).role !== "ADMIN") {
    return { error: "Not authorized" };
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { status: "REMOVED" },
  });

  revalidatePath("/");
  return { success: true };
}
