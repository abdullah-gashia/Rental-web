export const dynamic = "force-dynamic";

import { prisma }                   from "@/lib/prisma";
import { auth }                     from "@/lib/auth";
import { getCachedRecommendations } from "@/lib/actions/recommendations";
import { getTrendingSection }       from "@/lib/actions/featured";
import HomeClient from "./HomeClient";

type SearchParamsRaw = { [key: string]: string | string[] | undefined };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRaw>;
}) {
  // ── 0. Await searchParams (required in Next.js 15+) ───────────────────
  const params = await searchParams;

  // MANDATORY: Log raw params for testing
  console.log("Raw Params:", params);

  // ── 1. Parse safely ───────────────────────────────────────────────────
  const q         = typeof params.q         === "string" ? params.q         : undefined;
  const minStr    = typeof params.minPrice  === "string" ? params.minPrice  : undefined;
  const maxStr    = typeof params.maxPrice  === "string" ? params.maxPrice  : undefined;
  const condition = typeof params.condition === "string" ? params.condition : undefined;
  const sort      = typeof params.sort      === "string" ? params.sort      : undefined;
  const cat       = typeof params.cat       === "string" ? params.cat       : "all";

  // ── 2. Build WHERE clause ─────────────────────────────────────────────
  const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const where: any = {
    status: "APPROVED",
    OR: [
      { scheduledForDeletionAt: null },
      { scheduledForDeletionAt: { gt: graceCutoff } },
    ],
  };

  // 2a. Keyword Search (q)
  if (q && q.trim() !== "") {
    where.AND = [
      {
        OR: [
          { title:       { contains: q.trim(), mode: "insensitive" } },
          { description: { contains: q.trim(), mode: "insensitive" } },
          { seller: { name: { contains: q.trim(), mode: "insensitive" } } },
        ],
      },
    ];
  }

  // 2b. Price Filters
  if (minStr || maxStr) {
    where.price = {};
    if (minStr && !isNaN(Number(minStr))) where.price.gte = Number(minStr);
    if (maxStr && !isNaN(Number(maxStr))) where.price.lte = Number(maxStr);
  }

  // 2c. Condition Filter
  if (condition && ["LIKE_NEW", "GOOD", "FAIR", "NEEDS_REPAIR"].includes(condition)) {
    where.condition = condition;
  }

  // 2d. Category / listing-type
  if (cat !== "all") {
    if (cat === "rental") {
      where.listingType = "RENT";
    } else if (cat === "secondhand") {
      where.listingType = "SELL";
      where.category    = { slug: { in: ["secondhand", "books"] } };
    } else {
      where.category = { slug: cat };
    }
  }

  // MANDATORY: Log the final Prisma query for testing
  console.log("Prisma Where:", JSON.stringify(where, null, 2));

  // ── 3. Sorting Logic ──────────────────────────────────────────────────
  let orderBy: any = { createdAt: "desc" }; // Default
  if (sort === "price_asc")  orderBy = { price:  "asc"  };
  else if (sort === "price_desc") orderBy = { price:  "desc" };
  else if (sort === "newest")     orderBy = { createdAt: "desc" };
  else if (sort === "rating")     orderBy = { rating: "desc" };

  console.log("Prisma OrderBy:", JSON.stringify(orderBy));

  // ── 4. Fetch Data (items + recommendations in parallel) ──────────────
  const session = await auth();
  const userId  = (session?.user as any)?.id ?? null;

  const [items, recommendations, trendingItems] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy,
      include: {
        seller:   { select: { id: true, name: true, email: true, image: true, reviewsReceived: { select: { rating: true } } } },
        category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
        images:   { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" } },
      },
    }),
    getCachedRecommendations(userId),
    getTrendingSection(),
  ]);

  console.log("Items fetched:", items.length);

  // ── 5. Serialise dates ────────────────────────────────────────────────
  const serialized = items.map((item) => ({
    ...item,
    createdAt:              item.createdAt.toISOString(),
    updatedAt:              undefined,
    scheduledForDeletionAt: item.scheduledForDeletionAt?.toISOString() ?? null,
  }));

  // ── 6. Render ─────────────────────────────────────────────────────────
  return (
    <HomeClient
      items={(serialized ?? []) as any}
      trendingItems={trendingItems as any}
      recommendedItems={(recommendations?.items ?? []) as any}
      recommendationStrategy={recommendations.strategy}
      initialQ={q         ?? ""}
      initialCat={cat}
      initialMinPrice={minStr  ?? ""}
      initialMaxPrice={maxStr  ?? ""}
      initialCondition={condition ?? ""}
      initialSort={sort ?? "newest"}
    />
  );
}
