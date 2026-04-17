"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Advanced Search & Filter ────────────────────────

export interface ItemSearchParams {
  q?: string;          // full-text search across title, description, seller name
  cat?: string;        // CategorySlug: "all" | "secondhand" | "rental" | "electronics" | ...
  minPrice?: string;
  maxPrice?: string;
  condition?: string;  // "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR" | ""
  sort?: string;       // "newest" | "price_asc" | "price_desc" | "rating"
}

export async function getAdvancedItems(params: ItemSearchParams) {
  const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { q, cat, minPrice, maxPrice, condition, sort } = params;

  // Collect additional AND conditions on top of the base status/deletion filter
  const andConditions: object[] = [];

  // ── Search: multi-field partial/case-insensitive match ───────────────
  if (q?.trim()) {
    andConditions.push({
      OR: [
        { title:       { contains: q.trim(), mode: "insensitive" } },
        { description: { contains: q.trim(), mode: "insensitive" } },
        { seller: { name: { contains: q.trim(), mode: "insensitive" } } },
      ],
    });
  }

  // ── Category / listing-type filter ───────────────────────────────────
  if (cat && cat !== "all") {
    if (cat === "rental") {
      andConditions.push({ listingType: "RENT" });
    } else if (cat === "secondhand") {
      andConditions.push({
        category: { slug: { in: ["secondhand", "books"] } },
        listingType: "SELL",
      });
    } else {
      andConditions.push({ category: { slug: cat } });
    }
  }

  // ── Price range ───────────────────────────────────────────────────────
  const min = minPrice ? parseFloat(minPrice) : NaN;
  const max = maxPrice ? parseFloat(maxPrice) : NaN;
  if (!isNaN(min)) andConditions.push({ price: { gte: min } });
  if (!isNaN(max)) andConditions.push({ price: { lte: max } });

  // ── Condition ─────────────────────────────────────────────────────────
  const validConditions = ["LIKE_NEW", "GOOD", "FAIR", "NEEDS_REPAIR"];
  if (condition && validConditions.includes(condition)) {
    andConditions.push({ condition });
  }

  // ── Sort ──────────────────────────────────────────────────────────────
  let orderBy: object = { createdAt: "desc" };
  if (sort === "price_asc")  orderBy = { price: "asc"  };
  if (sort === "price_desc") orderBy = { price: "desc" };
  if (sort === "rating")     orderBy = { rating: "desc" };

  const items = await prisma.item.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { scheduledForDeletionAt: null },
        { scheduledForDeletionAt: { gt: graceCutoff } },
      ],
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    },
    include: {
      seller:   { select: { id: true, name: true, email: true, image: true, reviewsReceived: { select: { rating: true } } } },
      category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
      images:   { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" } },
    },
    orderBy,
  });

  return items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: undefined,
    scheduledForDeletionAt: item.scheduledForDeletionAt?.toISOString() ?? null,
    allowShipping: item.allowShipping ?? true,
    allowMeetup: item.allowMeetup ?? true,
    allowCOD: item.allowCOD ?? true,
    rentalRateType: item.rentalRateType ?? null,
    rentalRate: item.rentalRate ?? null,
    dailyRate: item.dailyRate ?? null,
    securityDeposit: item.securityDeposit ?? null,
    minRentalDays: item.minRentalDays ?? null,
    maxRentalDays: item.maxRentalDays ?? null,
    lateFeePerDay: item.lateFeePerDay ?? null,
    isRenewable: item.isRenewable ?? true,
    maxRenewals: item.maxRenewals ?? 1,
    rentalTerms: item.rentalTerms ?? null,
    rentalInstructions: item.rentalInstructions ?? null,
  }));
}

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
  allowShipping?: boolean;
  allowMeetup?: boolean;
  allowCOD?: boolean;
  /** Public URLs returned by /api/upload — saved as ItemImage rows */
  imageUrls?: string[];
  // Rental-specific (only used when listingType = RENT)
  rentalRateType?: "DAILY" | "MONTHLY" | "YEARLY";
  rentalRate?: number;
  dailyRate?: number;
  securityDeposit?: number;
  minRentalDays?: number;
  maxRentalDays?: number;
  lateFeePerDay?: number;
  isRenewable?: boolean;
  maxRenewals?: number;
  rentalTerms?: string;
  rentalInstructions?: string;
}

export async function createItem(data: CreateItemInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // ── Verification gate ─────────────────────────────────────────────────────
  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { verificationStatus: true },
  });
  if (seller?.verificationStatus !== "APPROVED") {
    return { error: "UNVERIFIED" };
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
      allowShipping: data.allowShipping ?? true,
      allowMeetup: data.allowMeetup ?? true,
      allowCOD: data.allowCOD ?? true,
      // Rental fields
      ...(data.listingType === "RENT" ? {
        rentalRateType:     data.rentalRateType     ?? "DAILY",
        rentalRate:         data.rentalRate          ?? null,
        dailyRate:          data.dailyRate          ?? null,
        securityDeposit:    data.securityDeposit    ?? null,
        minRentalDays:      data.minRentalDays       ?? 1,
        maxRentalDays:      data.maxRentalDays       ?? 30,
        lateFeePerDay:      data.lateFeePerDay       ?? 0,
        isRenewable:        data.isRenewable         ?? true,
        maxRenewals:        data.maxRenewals         ?? 1,
        rentalTerms:        data.rentalTerms         ?? null,
        rentalInstructions: data.rentalInstructions  ?? null,
      } : {}),
      sellerId: session.user.id,
      categoryId: category.id,
    },
  });

  // Persist uploaded images; first image is automatically the main one
  if (data.imageUrls && data.imageUrls.length > 0) {
    await prisma.itemImage.createMany({
      data: data.imageUrls.map((url, i) => ({
        itemId: item.id,
        url,
        isMain: i === 0,
        order: i,
      })),
    });
  }

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
