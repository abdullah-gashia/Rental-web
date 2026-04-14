"use server";

import { unstable_cache } from "next/cache";
import { prisma }         from "@/lib/prisma";
import type { ItemWithDetails } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecommendationReason =
  | "CATEGORY_MATCH"
  | "PRICE_MATCH"
  | "TRENDING"
  | "NEW_LISTING"
  | "DISCOVERY";

export type RecommendedItem = ItemWithDetails & {
  reason: RecommendationReason;
};

export type RecommendationResult = {
  items:           RecommendedItem[];
  strategy:        "personalized" | "trending" | "newest";
  profileMaturity: "new" | "developing" | "mature";
};

type PriceRange = "BUDGET" | "MID" | "PREMIUM" | "LUXURY";

type UserProfile = {
  topCategories:         Array<{ category: string; score: number; weight: number }>;
  preferredPriceRange:   PriceRange | null;
  recentlyViewedItemIds: string[];
  interactionCount:      number;
  isNewUser:             boolean;
  userId:                string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERACTION_WEIGHTS: Record<string, number> = {
  VIEW:           1.0,
  SEARCH_CLICK:   1.5,
  WISHLIST_ADD:   3.0,
  CONTACT_SELLER: 4.0,
  PURCHASE:       5.0,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function toPriceRange(price: number): PriceRange {
  if (price <= 100)  return "BUDGET";
  if (price <= 500)  return "MID";
  if (price <= 2000) return "PREMIUM";
  return "LUXURY";
}

function getTimeDecayWeight(createdAt: Date): number {
  const hoursAgo = (Date.now() - createdAt.getTime()) / 3_600_000;
  if (hoursAgo < 24)  return 1.0;
  if (hoursAgo < 48)  return 0.8;
  if (hoursAgo < 72)  return 0.5;
  if (hoursAgo < 168) return 0.3;
  return 0.1;
}

const PRICE_ORDER: PriceRange[] = ["BUDGET", "MID", "PREMIUM", "LUXURY"];

function isAdjacentRange(a: PriceRange, b: PriceRange): boolean {
  return Math.abs(PRICE_ORDER.indexOf(a) - PRICE_ORDER.indexOf(b)) === 1;
}

function getPriceRangeBounds(range: PriceRange) {
  switch (range) {
    case "BUDGET":  return { lte: 100 };
    case "MID":     return { gte: 101, lte: 500 };
    case "PREMIUM": return { gte: 501, lte: 2000 };
    case "LUXURY":  return { gte: 2001 };
  }
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

/** Serialize a Prisma Item row into the `ItemWithDetails` shape expected by ProductCard. */
function serializeItem(item: any): ItemWithDetails {
  return {
    id:                     item.id,
    title:                  item.title,
    description:            item.description,
    price:                  item.price,
    emoji:                  item.emoji ?? null,
    color:                  item.color ?? null,
    listingType:            item.listingType,
    condition:              item.condition,
    status:                 item.status,
    rejectReason:           item.rejectReason ?? null,
    scheduledForDeletionAt: item.scheduledForDeletionAt?.toISOString() ?? null,
    negotiable:             item.negotiable,
    shippable:              item.shippable,
    location:               item.location ?? null,
    contact:                item.contact  ?? null,
    rating:                 item.rating,
    createdAt:              item.createdAt.toISOString(),
    seller:                 item.seller,
    category:               item.category,
    images:                 item.images,
    allowShipping:          item.allowShipping ?? true,
    allowMeetup:            item.allowMeetup ?? true,
    allowCOD:               item.allowCOD ?? true,
  };
}

// Prisma include shape reused across all item queries
const ITEM_INCLUDE = {
  seller:   { select: { id: true, name: true, email: true, image: true } },
  category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
  images:   { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" as const } },
} as const;

// ─── Stage 1: Analyze User Profile ───────────────────────────────────────────

async function analyzeUserProfile(userId: string): Promise<UserProfile> {
  const interactions = await prisma.userInteraction.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  if (interactions.length === 0) {
    return {
      topCategories:         [],
      preferredPriceRange:   null,
      recentlyViewedItemIds: [],
      interactionCount:      0,
      isNewUser:             true,
      userId,
    };
  }

  // Score categories with time-decay × interaction-type weighting
  const categoryScores: Record<string, number> = {};
  const priceRangeCounts: Record<string, number> = {};

  for (const ix of interactions) {
    const timeWeight = getTimeDecayWeight(ix.createdAt);
    const typeWeight = INTERACTION_WEIGHTS[ix.type] ?? 1.0;
    const score = timeWeight * typeWeight;

    categoryScores[ix.category] = (categoryScores[ix.category] ?? 0) + score;

    if (ix.priceRange) {
      priceRangeCounts[ix.priceRange] = (priceRangeCounts[ix.priceRange] ?? 0) + 1;
    }
  }

  // Normalize to 0–1 and take top 5
  const maxScore = Math.max(...Object.values(categoryScores));
  const topCategories = Object.entries(categoryScores)
    .map(([category, score]) => ({ category, score, weight: score / maxScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const preferredPriceRange = (
    Object.entries(priceRangeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  ) as PriceRange | null;

  const recentlyViewedItemIds = [...new Set(interactions.map((i) => i.itemId))];

  return {
    topCategories,
    preferredPriceRange,
    recentlyViewedItemIds,
    interactionCount: interactions.length,
    isNewUser:        interactions.length < 5,
    userId,
  };
}

// ─── Stage 2: Generate Candidates ────────────────────────────────────────────

async function generateCandidates(profile: UserProfile, limit: number) {
  const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const slugs = profile.topCategories.map((c) => c.category);

  const priceFilter = profile.preferredPriceRange
    ? [{ price: getPriceRangeBounds(profile.preferredPriceRange) }]
    : [];

  const items = await prisma.item.findMany({
    where: {
      AND: [
        { status: "APPROVED" },
        {
          OR: [
            { scheduledForDeletionAt: null },
            { scheduledForDeletionAt: { gt: graceCutoff } },
          ],
        },
        { sellerId: { not: profile.userId } },
        { id: { notIn: profile.recentlyViewedItemIds } },
        {
          OR: [
            { category: { slug: { in: slugs } } },
            ...priceFilter,
          ],
        },
      ],
    },
    take:    limit * 3,  // over-fetch for scoring headroom
    orderBy: [
      { viewCount: "desc" },
      { createdAt: "desc" },
    ],
    include: ITEM_INCLUDE,
  });

  return items;
}

// ─── Stage 3: Score & Rank ────────────────────────────────────────────────────

type ScoredItem = ReturnType<typeof serializeItem> & {
  score:      number;
  reason:     RecommendationReason;
  _rawViewCount: number;
};

function scoreAndRank(candidates: any[], profile: UserProfile): ScoredItem[] {
  if (candidates.length === 0) return [];

  const maxViewCount = Math.max(...candidates.map((c) => c.viewCount ?? 0), 1);
  const now          = Date.now();

  const scored = candidates.map((item) => {
    // ── Category match (0–1) ──
    const catIdx = profile.topCategories.findIndex(
      (c) => c.category === item.category.slug
    );
    const categoryMatchScore =
      catIdx === 0 ? 1.0 :
      catIdx === 1 ? 0.7 :
      catIdx === 2 ? 0.4 :
      catIdx >= 3  ? 0.2 : 0;

    // ── Price match (0–1) ──
    const itemRange = toPriceRange(item.price);
    const priceMatchScore =
      !profile.preferredPriceRange       ? 0.5 :
      itemRange === profile.preferredPriceRange        ? 1.0 :
      isAdjacentRange(itemRange, profile.preferredPriceRange) ? 0.5 : 0;

    // ── Popularity (0–1) ──
    const popularityScore = Math.min((item.viewCount ?? 0) / maxViewCount, 1.0);

    // ── Freshness (0–1) ──
    const hoursOld = (now - new Date(item.createdAt).getTime()) / 3_600_000;
    const freshnessScore =
      hoursOld < 24  ? 1.0 :
      hoursOld < 48  ? 0.8 :
      hoursOld < 168 ? 0.5 :
      hoursOld < 720 ? 0.2 : 0;

    // ── Diversity bonus: controlled randomness ──
    const diversityBonus = Math.random() * 0.3;

    const finalScore =
      categoryMatchScore * 0.40 +
      priceMatchScore    * 0.15 +
      popularityScore    * 0.15 +
      freshnessScore     * 0.15 +
      diversityBonus     * 0.15;

    // Assign the label that contributed most to the score
    const componentScores: [RecommendationReason, number][] = [
      ["CATEGORY_MATCH", categoryMatchScore * 0.40],
      ["PRICE_MATCH",    priceMatchScore    * 0.15],
      ["TRENDING",       popularityScore    * 0.15],
      ["NEW_LISTING",    freshnessScore     * 0.15],
      ["DISCOVERY",      diversityBonus     * 0.15],
    ];
    const reason = componentScores.sort((a, b) => b[1] - a[1])[0][0];

    return {
      ...serializeItem(item),
      score:          finalScore,
      reason,
      _rawViewCount:  item.viewCount ?? 0,
    } as ScoredItem;
  });

  return scored.sort((a, b) => b.score - a.score);
}

// ─── Stage 4: Compose Feed (diversity rules) ─────────────────────────────────

function composeRecommendationFeed(scored: ScoredItem[], limit: number): ScoredItem[] {
  const feed:          ScoredItem[]           = [];
  const usedCategories = new Map<string, number>();

  for (const item of scored) {
    if (feed.length >= limit) break;

    // Max 3 items from the same category
    const catCount = usedCategories.get(item.category.slug) ?? 0;
    if (catCount >= 3) continue;

    // Max 2 items from the same seller
    const sellerCount = feed.filter((f) => f.seller.id === item.seller.id).length;
    if (sellerCount >= 2) continue;

    feed.push(item);
    usedCategories.set(item.category.slug, catCount + 1);
  }

  return feed;
}

// ─── Fallback strategies ──────────────────────────────────────────────────────

async function getTrendingItems(limit: number): Promise<RecommendedItem[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const graceCutoff  = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const items = await prisma.item.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { scheduledForDeletionAt: null },
        { scheduledForDeletionAt: { gt: graceCutoff } },
      ],
      lastViewedAt: { gte: sevenDaysAgo },
    },
    orderBy: { viewCount: "desc" },
    take:    limit,
    include: ITEM_INCLUDE,
  });

  // Fall back to newest if no trending data yet
  if (items.length === 0) {
    return getNewestItems(limit);
  }

  return items.map((i) => ({ ...serializeItem(i), reason: "TRENDING" as const }));
}

async function getNewestItems(limit: number): Promise<RecommendedItem[]> {
  const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const items = await prisma.item.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { scheduledForDeletionAt: null },
        { scheduledForDeletionAt: { gt: graceCutoff } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take:    limit,
    include: ITEM_INCLUDE,
  });

  return items.map((i) => ({ ...serializeItem(i), reason: "NEW_LISTING" as const }));
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function getRecommendedItems(
  userId: string | null | undefined,
  limit   = 10
): Promise<RecommendationResult> {
  // PATH A: anonymous or no session → trending
  if (!userId) {
    return {
      items:           await getTrendingItems(limit),
      strategy:        "trending",
      profileMaturity: "new",
    };
  }

  const profile = await analyzeUserProfile(userId);

  // PATH B: not enough history → trending
  if (profile.isNewUser) {
    return {
      items:           await getTrendingItems(limit),
      strategy:        "trending",
      profileMaturity: "new",
    };
  }

  // PATH C: returning user
  const candidates = await generateCandidates(profile, limit);

  if (candidates.length < Math.ceil(limit / 2)) {
    // Not enough category matches — supplement with trending
    const trending  = await getTrendingItems(limit);
    const mixed     = deduplicateById([
      ...candidates.map((c) => ({ ...serializeItem(c), reason: "CATEGORY_MATCH" as const })),
      ...trending,
    ]).slice(0, limit);

    return {
      items:           mixed,
      strategy:        "trending",
      profileMaturity: "developing",
    };
  }

  const scored = scoreAndRank(candidates, profile);
  const feed   = composeRecommendationFeed(scored, limit);

  return {
    items:           feed,
    strategy:        "personalized",
    profileMaturity: profile.interactionCount >= 20 ? "mature" : "developing",
  };
}

// ─── Cached wrapper (5-minute TTL, per-user) ─────────────────────────────────

export const getCachedRecommendations = unstable_cache(
  async (userId: string | null) => getRecommendedItems(userId, 10),
  ["recommendations"],
  { revalidate: 300 }  // 5 minutes
);
