"use server";

import { auth }   from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrackingParams = {
  itemId:      string;
  category:    string;           // category.slug
  price:       number;
  source?:     "search" | "browse" | "recommendation" | "direct";
};

type InteractionType = "VIEW" | "SEARCH_CLICK" | "WISHLIST_ADD" | "CONTACT_SELLER" | "PURCHASE";
type PriceRange      = "BUDGET" | "MID" | "PREMIUM" | "LUXURY";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPriceRange(price: number): PriceRange {
  if (price <= 100)  return "BUDGET";
  if (price <= 500)  return "MID";
  if (price <= 2000) return "PREMIUM";
  return "LUXURY";
}

/** Deduplication windows per interaction type (ms) */
const DEDUP_MS: Record<InteractionType, number | null> = {
  VIEW:           30 * 60 * 1000,  // 30 min
  SEARCH_CLICK:    5 * 60 * 1000,  //  5 min
  WISHLIST_ADD:   null,            // no dedup — each add is intentional
  CONTACT_SELLER: 60 * 60 * 1000, //  1 hour
  PURCHASE:       null,            // no dedup
};

// ─── Core logger ──────────────────────────────────────────────────────────────

async function _log(
  type:   InteractionType,
  params: TrackingParams,
  userId: string
): Promise<void> {
  const dedupMs = DEDUP_MS[type];

  if (dedupMs !== null) {
    const cutoff = new Date(Date.now() - dedupMs);
    const recent = await prisma.userInteraction.findFirst({
      where: { userId, itemId: params.itemId, type, createdAt: { gte: cutoff } },
      select: { id: true },
    });
    if (recent) return; // skip duplicate
  }

  const priceRange = toPriceRange(params.price);

  if (type === "VIEW") {
    // Atomic: log interaction + increment viewCount in one transaction
    await prisma.$transaction([
      prisma.userInteraction.create({
        data: {
          userId,
          itemId:    params.itemId,
          type,
          category:  params.category,
          priceRange,
          source:    params.source ?? null,
        },
      }),
      prisma.item.update({
        where: { id: params.itemId },
        data:  { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      }),
    ]);
  } else {
    await prisma.userInteraction.create({
      data: {
        userId,
        itemId:    params.itemId,
        type,
        category:  params.category,
        priceRange,
        source:    params.source ?? null,
      },
    });
  }
}

// ─── logItemView ──────────────────────────────────────────────────────────────
// Fire-and-forget — errors are swallowed so they never impact UX

export async function logItemView(params: TrackingParams): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.id) return; // only track authenticated users

    // Respect opt-out preference
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { trackingEnabled: true },
    });
    if (!user?.trackingEnabled) return;

    await _log("VIEW", params, session.user.id);
  } catch (err) {
    console.error("[tracking] logItemView failed:", err);
    // Never throw — tracking must not break the user's experience
  }
}

// ─── logInteraction ───────────────────────────────────────────────────────────
// For WISHLIST_ADD, CONTACT_SELLER, PURCHASE, SEARCH_CLICK

export async function logInteraction(
  type:   Exclude<InteractionType, "VIEW">,
  params: TrackingParams
): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.id) return;

    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { trackingEnabled: true },
    });
    if (!user?.trackingEnabled) return;

    await _log(type, params, session.user.id);
  } catch (err) {
    console.error(`[tracking] logInteraction(${type}) failed:`, err);
  }
}
