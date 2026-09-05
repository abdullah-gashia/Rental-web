"use client";

import { useEffect, useRef, useState } from "react";
import { useT, useTr } from "@/lib/i18n/LocaleProvider";
import type { ItemWithDetails } from "@/lib/types";
import ProductCard from "@/components/items/ProductCard";
import Panel from "@/components/ui/Panel";

interface RecentlyAddedProps {
  items: ItemWithDetails[];
  /** How many more appear each time the list grows. */
  step?: number;
  onItemClick: (item: ItemWithDetails) => void;
}

/**
 * The one photo-forward block on the home view, so the page isn't all rows.
 *
 * It used to page five at a time, which with five hundred listings meant a
 * hundred pages and a hundred clicks to reach the end. Scrolling is what
 * people already do on this page, so the grid just grows: a sentinel below the
 * last row asks for more as soon as it comes into view, and the button under
 * it is there for anyone who would rather click, or whose browser does not
 * report intersections.
 */
export default function RecentlyAdded({ items, step = 20, onItemClick }: RecentlyAddedProps) {
  const [shown, setShown] = useState(step);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const t = useT();
  const tr = useTr();

  const total = items.length;
  const hasMore = shown < total;

  // A new set of items — a different filter, say — starts from the top again.
  // Keyed on what the list holds rather than on the array itself, so a parent
  // that rebuilds the array on every render does not reset the grid each time.
  const listKey = `${total}:${items[0]?.id ?? ""}`;
  useEffect(() => {
    setShown(step);
  }, [listKey, step]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((n) => Math.min(n + step, total));
        }
      },
      // Start fetching a screenful early so the grid never visibly stalls.
      { rootMargin: "600px 0px" },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, step, total, shown]);

  if (total === 0) return null;

  const visible = items.slice(0, shown);

  return (
    <Panel
      title={t("recent_title")}
      sub={t("showing_range", { start: 1, end: visible.length, total })}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8">
        {visible.map((item, i) => (
          <ProductCard key={item.id} item={item} index={i} onClick={() => onItemClick(item)} />
        ))}
      </div>

      {hasMore && (
        <>
          <div ref={sentinel} aria-hidden className="h-px" />
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setShown((n) => Math.min(n + step, total))}
              className="ui-btn"
            >
              {tr("ดูเพิ่ม")}
            </button>
          </div>
        </>
      )}

      {!hasMore && total > step && (
        <p className="text-center text-[12.5px] text-[var(--hp-muted)] mt-8">
          {tr("ครบทุกรายการแล้ว")}
        </p>
      )}
    </Panel>
  );
}
