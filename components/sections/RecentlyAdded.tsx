"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { ItemWithDetails } from "@/lib/types";
import ProductCard from "@/components/items/ProductCard";
import Panel from "@/components/ui/Panel";

interface RecentlyAddedProps {
  items: ItemWithDetails[];
  perPage?: number;
  onItemClick: (item: ItemWithDetails) => void;
}

/** The one photo-forward block on the home view, so the page isn't all rows. */
export default function RecentlyAdded({ items, perPage = 5, onItemClick }: RecentlyAddedProps) {
  const [page, setPage] = useState(0);
  const t = useT();

  if (items.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage   = Math.min(page, totalPages - 1);
  const start      = safePage * perPage;
  const visible    = items.slice(start, start + perPage);
  const end        = Math.min(start + perPage, items.length);

  return (
    <Panel
      title={t("recent_title")}
      sub={t("showing_range", { start: start + 1, end, total: items.length })}
      onPrev={() => setPage((p) => Math.max(0, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      prevDisabled={safePage === 0}
      nextDisabled={safePage >= totalPages - 1}
      meta={
        <span className="hp-num text-[12px] text-[var(--hp-muted)] mr-1">
          {safePage + 1} / {totalPages}
        </span>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8">
        {visible.map((item, i) => (
          <ProductCard key={item.id} item={item} index={i} onClick={() => onItemClick(item)} />
        ))}
      </div>

      <div className="hp-dots mt-7">
        {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
          <button
            key={i}
            className={`hp-dot ${i === safePage ? "active" : ""}`}
            onClick={() => setPage(i)}
            aria-label={`หน้า ${i + 1}`}
          />
        ))}
      </div>
    </Panel>
  );
}
