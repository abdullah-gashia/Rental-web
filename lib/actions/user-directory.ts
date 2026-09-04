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
  /** True for a งานภัทร office account, which is listed and read differently. */
  isOffice: boolean;
  officeLocation: string | null;
  /** Office only: equipment on the shelf, and how many times it has gone out. */
  lendItemCount: number;
  lentOutCount: number;
}

export async function getUserDirectory(search?: string): Promise<DirectoryUser[]> {
  const q = search?.trim();

  const where: Record<string, unknown> = {
    isBanned: false,
    // Admins moderate rather than trade, so they stay out of the directory.
    // งานภัทร accounts belong in it though — a student who cannot find the
    // office cannot borrow anything from it.
    role: { in: ["STUDENT", "PATTARA"] },
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };

  const users = await prisma.user.findMany({
    where: where as never,
    // Offices first, then the most trusted people. A student looking for
    // somewhere to borrow from should not have to scroll.
    orderBy: [{ role: "desc" }, { trustScore: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: {
      id: true, name: true, image: true, trustScore: true, createdAt: true,
      verificationStatus: true, role: true,
      officeName: true, officeLocation: true,
      reviewsReceived: { select: { rating: true } },
      _count: { select: { items: true, ownedLendingItems: true } },
    },
  });

  const ids = users.map((u) => u.id);

  const [soldCounts, lentCounts] = await Promise.all([
    prisma.escrowOrder.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: ids }, status: "COMPLETED" },
      _count: { _all: true },
    }),
    prisma.lendingOrder.groupBy({
      by: ["lenderId"],
      where: {
        lenderId: { in: ids },
        status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] },
      },
      _count: { _all: true },
    }),
  ]);

  const soldBySeller = new Map(soldCounts.map((r) => [r.sellerId, r._count._all]));
  const lentByOffice = new Map(lentCounts.map((r) => [r.lenderId, r._count._all]));

  return users.map((u) => {
    const isOffice = u.role === "PATTARA";
    return {
      id: u.id,
      name: isOffice ? (u.officeName ?? u.name) : u.name,
      image: u.image,
      trustScore: u.trustScore,
      // Stars and trust are about trading between people. They mean nothing
      // for an office that lends equipment, so they are not published for one.
      avgRating: isOffice || u.reviewsReceived.length === 0
        ? null
        : u.reviewsReceived.reduce((s, r) => s + r.rating, 0) / u.reviewsReceived.length,
      reviewCount: isOffice ? 0 : u.reviewsReceived.length,
      itemCount: u._count.items,
      soldCount: soldBySeller.get(u.id) ?? 0,
      verified: u.verificationStatus === "APPROVED",
      memberSince: u.createdAt.toISOString(),
      isOffice,
      officeLocation: u.officeLocation,
      lendItemCount: u._count.ownedLendingItems,
      lentOutCount: lentByOffice.get(u.id) ?? 0,
    };
  });
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
