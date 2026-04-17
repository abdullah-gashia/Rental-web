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

  const badgeInfo  = getBadgeType(item);
  const isRent     = item.listingType === "RENT";
  const priceColor = isRent ? "#1d4ed8" : "#111";

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

  return (
    <div
      className="group cursor-pointer flex flex-col card-lift fade-up"
      style={{ animationDelay: `${Math.min(index * 0.055, 0.5)}s` }}
      onClick={onClick}
    >
      {/* ── Image container ─────────────────────── */}
      <div
        className="prod-img-wrap"
        style={{ background: item.color || "#edeae4" }}
      >
        {item.images.length > 0 ? (
          <img
            src={item.images[0].url}
            alt={item.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="prod-emoji">{item.emoji || "📦"}</div>
        )}

        {/* Seller chip */}
        <div className="absolute top-2 left-2 bg-white/[0.93] backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm max-w-[calc(100%-48px)]">
          <span className="text-[11px] font-semibold text-[#333] truncate">
            {item.seller.name || "User"}
          </span>
          {(() => {
            const reviews = item.seller.reviewsReceived ?? [];
            if (reviews.length === 0) return null;
            const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
            return (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#f59e0b] flex-shrink-0">
                ★ {avg.toFixed(1)}
              </span>
            );
          })()}
        </div>

        {/* Wishlist button */}
        <WishlistButton
          itemId={item.id}
          size="sm"
          className="absolute top-2 right-2 bg-white/[0.93] backdrop-blur-sm border-none p-1.5 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
        />

        {/* Rent overlay badge */}
        {isRent && (
          <div className="absolute bottom-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            เช่า
          </div>
        )}
      </div>

      {/* ── Info ─────────────────────────────────── */}
      <div className="px-0.5 flex-1 flex flex-col">
        <h3 className="text-[13px] font-semibold text-[#111] line-clamp-2 leading-snug mb-1">
          {item.title}
        </h3>

        <div className="flex items-center justify-between gap-1 mt-auto">
          <p className="text-[14px] font-extrabold tracking-tight" style={{ color: priceColor }}>
            {priceLabel}
          </p>
          {badgeInfo && (
            <Badge type={badgeInfo.type} label={t(badgeInfo.label as any)} />
          )}
        </div>

        {item.location && (
          <p className="text-[11px] text-[#9a9590] mt-0.5 truncate flex items-center gap-0.5">
            <span className="text-[10px]">📍</span>
            {item.location}
          </p>
        )}
      </div>
    </div>
  );
}
