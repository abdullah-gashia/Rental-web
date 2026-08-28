"use client";

import ProductCard from "@/components/items/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { RecommendedItem, RecommendationReason } from "@/lib/actions/recommendations";
import type { ItemWithDetails } from "@/lib/types";

function reasonBadge(reason: RecommendationReason): string | null {
  switch (reason) {
    case "CATEGORY_MATCH": return "ตรงใจคุณ";
    case "PRICE_MATCH":    return "งบพอดี";
    case "TRENDING":       return "กำลังฮิต";
    case "NEW_LISTING":    return "มาใหม่";
    case "DISCOVERY":      return null;
  }
}

interface Props {
  items:    RecommendedItem[];
  strategy: "personalized" | "trending" | "newest";
  onItemClick: (item: ItemWithDetails) => void;
}

export default function RecommendedSection({ items, strategy, onItemClick }: Props) {
  if (items.length === 0) return null;

  const isPersonalized = strategy === "personalized";

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow={isPersonalized ? "สำหรับคุณ" : "ยอดนิยม"}
        title={isPersonalized ? "สินค้าที่คุณอาจสนใจ" : "กำลังมาแรงตอนนี้"}
        sub={isPersonalized ? "แนะนำจากสิ่งที่คุณเคยดู" : undefined}
      />

      {/* Item grid — same responsive grid as ProductGrid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
        {items.map((item, idx) => {
          const badge = reasonBadge(item.reason);
          return (
            <div key={item.id} className="relative">
              {/* Rent cards already show a chip top-left, so stack this one under it */}
              {badge && (
                <div
                  className={`absolute left-2 z-10 pointer-events-none ${
                    item.listingType === "RENT" ? "top-[34px]" : "top-2"
                  }`}
                >
                  <span className="hp-chip border-[var(--psu-sky-200)] bg-[var(--psu-sky)] text-[var(--psu-indigo)] font-semibold">
                    {badge}
                  </span>
                </div>
              )}
              <ProductCard
                item={item}
                index={idx}
                onClick={() => onItemClick(item)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
