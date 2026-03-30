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
  if (item.shippable) return { type: "ship", label: "badge_ship" };
  if (item.listingType === "RENT") return { type: "rent", label: "badge_rent" };
  if (item.condition === "LIKE_NEW") return { type: "new", label: "badge_new" };
  return null;
}

export default function ProductCard({ item, index = 0, onClick }: ProductCardProps) {
  const { t, locale } = useLocaleStore();

  const badgeInfo = getBadgeType(item);
  const priceColor = item.listingType === "RENT" ? "#1d4ed8" : "#111";
  const priceDisplay =
    item.listingType === "RENT"
      ? `${item.price.toLocaleString()} ฿${t("per_day")}`
      : `${item.price.toLocaleString()} ฿`;

  return (
    <div
      className="group cursor-pointer flex flex-col card-lift fade-up"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={onClick}
    >
      <div className="prod-img-wrap" style={{ background: item.color || "#f0ede7" }}>
        {item.images.length > 0 ? (
          <img src={item.images[0].url} alt={item.title} />
        ) : (
          <div className="prod-emoji">{item.emoji || "📦"}</div>
        )}
        <div className="absolute top-2 left-2 bg-white/[0.92] backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-semibold text-[#333] shadow-sm">
          {item.seller.name || "User"}
          {item.rating > 0 && (
            <>
              <span className="text-[#f59e0b]">★</span>
              {item.rating}
            </>
          )}
        </div>
        <WishlistButton
          itemId={item.id}
          size="sm"
          className="absolute top-2 right-2 bg-white/[0.92] backdrop-blur-sm border-none p-1.5 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
        />
      </div>
      <div className="px-0.5">
        <div className="flex justify-between items-start gap-1.5">
          <h3 className="text-[13px] font-semibold text-[#111] line-clamp-1 flex-1">{item.title}</h3>
          <p className="text-[13px] font-bold whitespace-nowrap" style={{ color: priceColor }}>
            {priceDisplay}
          </p>
        </div>
        {badgeInfo && (
          <div className="mt-1">
            <Badge type={badgeInfo.type} label={t(badgeInfo.label as any)} />
          </div>
        )}
        <p className="text-[11px] text-[#9a9590] mt-0.5 truncate">{item.location}</p>
      </div>
    </div>
  );
}
