"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import type { ItemWithDetails } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import WishlistButton from "@/components/ui/WishlistButton";

interface ProductCardProps {
  item: ItemWithDetails;
  index?: number;
  onClick?: () => void;
}

function getBadgeType(item: ItemWithDetails): { type: "sale" | "rent" | "ship" | "new"; label: string } | null {
  if (item.listingType === "RENT") return { type: "rent", label: "badge_rent" };
  if (item.shippable)              return { type: "ship", label: "badge_ship" };
  if (item.condition === "LIKE_NEW") return { type: "new", label: "badge_new" };
  return null;
}

export default function ProductCard({ item, index = 0, onClick }: ProductCardProps) {
  const { t } = useLocaleStore();

  const badgeInfo = getBadgeType(item);
  const isRent    = item.listingType === "RENT";

  // For rent items, use the entered rate amount (rentalRate) or the computed dailyRate.
  // item.price is always 0 for RENT listings — never display it.
  const rentAmount  = item.rentalRate ?? item.dailyRate ?? 0;
  const rateSuffix  =
    item.rentalRateType === "MONTHLY" ? t("per_month") :
    item.rentalRateType === "YEARLY"  ? t("per_year")  :
    t("per_day");
  const priceLabel = isRent
    ? `฿${rentAmount.toLocaleString()}${rateSuffix}`
    : `฿${item.price.toLocaleString()}`;

  // Seller rating — shown as a plain number, no star clutter
  const reviews = item.seller.reviewsReceived ?? [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  return (
    <div className="hp-card group" onClick={onClick}>
      {/* ── Thumbnail ────────────────────────────── */}
      <div className="hp-thumb">
        {item.images.length > 0 ? (
          <img
            src={item.images[0].url}
            alt={item.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="hp-thumb-fallback">{item.emoji || "📦"}</div>
        )}

        {/* Listing type — only marked when it is a rental */}
        {isRent && (
          <div className="absolute top-2 left-2">
            <span className="hp-chip hp-chip-solid">เช่า</span>
          </div>
        )}

        {/* Wishlist */}
        <WishlistButton
          itemId={item.id}
          size="sm"
          className="absolute top-2 right-2 w-[26px] h-[26px] bg-white/94 border border-[rgba(15,30,53,0.07)] rounded-md flex items-center justify-center transition-colors hover:bg-white"
        />
      </div>

      {/* ── Info ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-1">
        <h3 className="hp-title text-[13px] font-medium text-[var(--hp-ink)] line-clamp-2 leading-[1.45]">
          {item.title}
        </h3>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`hp-price ${isRent ? "hp-price-rent" : ""}`}>
            {priceLabel}
          </span>
          {badgeInfo && (
            <Badge type={badgeInfo.type} label={t(badgeInfo.label as any)} />
          )}
        </div>

        {/* Seller line — one row of quiet metadata */}
        <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--hp-muted)] leading-none">
          <span className="truncate">{item.seller.name || "User"}</span>
          {avgRating !== null && (
            <>
              <span className="text-[var(--hp-border-str)]">·</span>
              <span className="hp-num flex-shrink-0">{avgRating.toFixed(1)}</span>
            </>
          )}
        </div>

        {item.location && (
          <p className="text-[11.5px] text-[var(--hp-muted)] truncate flex items-center gap-1 leading-none">
            <svg className="w-3 h-3 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {item.location}
          </p>
        )}
      </div>
    </div>
  );
}
