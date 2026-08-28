"use client";

import { useState } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import type { ItemWithDetails } from "@/lib/types";
import ProductCard from "@/components/items/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";

interface RecentlyAddedProps {
  items: ItemWithDetails[];
  perPage?: number;
  onItemClick: (item: ItemWithDetails) => void;
}

export default function RecentlyAdded({ items, perPage = 5, onItemClick }: RecentlyAddedProps) {
  const [page, setPage] = useState(0);
  const t = useLocaleStore((s) => s.t);

  const totalPages = Math.ceil(items.length / perPage);
  const start = page * perPage;
  const visible = items.slice(start, start + perPage);
  const end = Math.min(start + perPage, items.length);

  return (
    <section className="mb-12">
      <SectionHeader
        eyebrow="ล่าสุด"
        title={t("recent_title")}
        sub={t("showing_range", { start: start + 1, end, total: items.length })}
        action={
          <>
            <span className="hp-num text-[12px] text-[var(--hp-muted)] mr-1">
              {page + 1} / {totalPages}
            </span>
            <button
              className="pager-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="หน้าก่อนหน้า"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="pager-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="หน้าถัดไป"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
        {visible.map((item, i) => (
          <ProductCard key={item.id} item={item} index={i} onClick={() => onItemClick(item)} />
        ))}
      </div>

      {/* Dot pager */}
      <div className="flex items-center justify-center gap-1.5 mt-7">
        {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
          <div
            key={i}
            className={`pager-dot ${i === page ? "active" : ""}`}
            style={{ width: i === page ? 18 : 4 }}
            onClick={() => setPage(i)}
          />
        ))}
      </div>
    </section>
  );
}
