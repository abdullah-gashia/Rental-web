"use client";

import type { TrFn } from "@/lib/i18n/phrases";
import { useTr } from "@/lib/i18n/LocaleProvider";

import { useState } from "react";
import ProductRow from "@/components/items/ProductRow";
import Panel from "@/components/ui/Panel";
import type { RecommendedItem, RecommendationReason } from "@/lib/actions/recommendations";
import type { ItemWithDetails } from "@/lib/types";

function reasonBadge(reason: RecommendationReason, tr: TrFn): string | null {
  switch (reason) {
    case "CATEGORY_MATCH": return tr("ตรงใจคุณ");
    case "PRICE_MATCH":    return tr("งบพอดี");
    case "TRENDING":       return tr("กำลังฮิต");
    case "NEW_LISTING":    return tr("มาใหม่");
    case "DISCOVERY":      return null;
  }
}

interface Props {
  items:    RecommendedItem[];
  strategy: "personalized" | "trending" | "newest";
  onItemClick: (item: ItemWithDetails) => void;
}

const PER_PAGE = 6;

export default function RecommendedSection({ items, strategy, onItemClick }: Props) {
  const tr = useTr();
  const [page, setPage] = useState(0);

  if (items.length === 0) return null;

  const isPersonalized = strategy === "personalized";
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages - 1);
  const visible    = items.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  return (
    <Panel
      title={isPersonalized ? tr("สินค้าที่คุณอาจสนใจ") : tr("กำลังมาแรงตอนนี้")}
      sub={isPersonalized ? tr("แนะนำจากสิ่งที่คุณเคยดู") : undefined}
      onPrev={() => setPage((p) => Math.max(0, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      prevDisabled={safePage === 0}
      nextDisabled={safePage >= totalPages - 1}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-x-5 gap-y-1 -mx-2">
        {visible.map((item) => {
          const badge = reasonBadge(item.reason, tr);
          return (
            <div key={item.id} className="relative">
              <ProductRow item={item} onClick={() => onItemClick(item)} />
              {badge && (
                <span className="absolute top-1 left-1 z-10 pointer-events-none hp-chip !h-[18px] !text-[10px] border-[var(--psu-sky-200)] bg-[var(--psu-sky)] text-[var(--psu-indigo)] font-semibold">
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
