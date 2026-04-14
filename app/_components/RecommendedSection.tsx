"use client";

import ProductCard from "@/components/items/ProductCard";
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
    <section className="mt-10 mb-2">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-[#111]">
            {isPersonalized ? "สินค้าที่คุณอาจสนใจ" : "กำลังมาแรงตอนนี้"}
          </h2>
          {isPersonalized && (
            <p className="text-xs text-[#9a9590] mt-0.5 flex items-center gap-1">
              <span className="text-[#e8500a]">✦</span>
              แนะนำจากสิ่งที่คุณเคยดู
            </p>
          )}
        </div>
        <div className="ml-auto flex-shrink-0">
          {isPersonalized ? (
            <span className="text-[10px] font-semibold text-[#e8500a] bg-[#e8500a]/8 px-2.5 py-1 rounded-full border border-[#e8500a]/20">
              ✦ เฉพาะคุณ
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[#555] bg-[#f0ede7] px-2.5 py-1 rounded-full">
              🔥 ยอดนิยม
            </span>
          )}
        </div>
      </div>

      {/* Item grid — same responsive grid as ProductGrid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item, idx) => {
          const badge = reasonBadge(item.reason);
          return (
            <div key={item.id} className="relative">
              {badge && (
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#e8500a] text-white shadow-sm">
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
