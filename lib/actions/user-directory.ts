"use server";

import { prisma } from "@/lib/prisma";

/**
 * Public directory of people on the marketplace.
 *
 * Only what a shopper needs to judge who they are dealing with: display name,
 * avatar, trust score, star rating, how much they have listed and sold.
 * E-mail addresses, phone numbers, wallet balances and abuse reports are never
 * part of this shape.
 */

export interface DirectoryUser {
  id: string;
  name: string | null;
  image: string | null;
  trustScore: number;
  avgRating: number | null;
  reviewCount: number;
  itemCount: number;
  soldCount: number;
  verified: boolean;
  memberSince: string;
}

export async function getUserDirectory(search?: string): Promise<DirectoryUser[]> {
  const q = search?.trim();

  const where: Record<string, unknown> = {
    isBanned: false,
    // Admins moderate rather than trade, so they stay out of the directory
    role: "STUDENT",
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };

  const users = await prisma.user.findMany({
    where: where as never,
    orderBy: [{ trustScore: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: {
      id: true, name: true, image: true, trustScore: true, createdAt: true,
      verificationStatus: true,
      reviewsReceived: { select: { rating: true } },
      _count: { select: { items: true } },
    },
  });

  const soldCounts = await prisma.escrowOrder.groupBy({
    by: ["sellerId"],
    where: { sellerId: { in: users.map((u) => u.id) }, status: "COMPLETED" },
    _count: { _all: true },
  });
  const soldBySeller = new Map(soldCounts.map((r) => [r.sellerId, r._count._all]));

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    trustScore: u.trustScore,
    avgRating: u.reviewsReceived.length > 0
      ? u.reviewsReceived.reduce((s, r) => s + r.rating, 0) / u.reviewsReceived.length
      : null,
    reviewCount: u.reviewsReceived.length,
    itemCount: u._count.items,
    soldCount: soldBySeller.get(u.id) ?? 0,
    verified: u.verificationStatus === "APPROVED",
    memberSince: u.createdAt.toISOString(),
  }));
}

/** The listings shown on a public profile. */
export async function getUserPublicItems(userId: string) {
  const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const items = await prisma.item.findMany({
    where: {
      sellerId: userId,
      status: "APPROVED",
      OR: [
        { scheduledForDeletionAt: null },
        { scheduledForDeletionAt: { gt: graceCutoff } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true, title: true, price: true, emoji: true, listingType: true,
      location: true, rentalRate: true, dailyRate: true, rentalRateType: true,
      category: { select: { nameTh: true } },
      images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
    },
  });

  const suffix: Record<string, string> = { DAILY: "/วัน", MONTHLY: "/เดือน", YEARLY: "/ปี" };

  return items.map((i) => {
    const isRent = i.listingType === "RENT";
    const amount = isRent ? (i.rentalRate ?? i.dailyRate ?? 0) : i.price;
    return {
      id: i.id,
      title: i.title,
      priceLabel: `฿${amount.toLocaleString()}${isRent ? (suffix[i.rentalRateType ?? "DAILY"] ?? "/วัน") : ""}`,
      isRent,
      location: i.location,
      categoryTh: i.category.nameTh,
      imageUrl: i.images[0]?.url ?? null,
      emoji: i.emoji,
      href: `/?q=${encodeURIComponent(i.title)}`,
    };
  });
}
