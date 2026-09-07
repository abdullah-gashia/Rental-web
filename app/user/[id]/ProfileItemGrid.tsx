"use client";

import { useEffect, useRef, useState } from "react";
import { useTr } from "@/lib/i18n/LocaleProvider";

export interface ProfileItem {
  id: string;
  title: string;
  priceLabel: string;
  isRent: boolean;
  location: string | null;
  categoryTh: string;
  imageUrl: string | null;
  emoji: string | null;
  href: string;
}

/**
 * A seller's listings, drawn a screenful at a time.
 *
 * The heading counts every listing they have; the grid starts with a couple of
 * rows and grows as it is scrolled past, the same way the home page does. A
 * seller with fifty listings would otherwise mount fifty images at once for a
 * visitor who probably wanted to read the reviews.
 */
export default function ProfileItemGrid({
  items,
  total,
  step = 16,
}: {
  items: ProfileItem[];
  total: number;
  step?: number;
}) {
  const [shown, setShown] = useState(step);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const tr = useTr();

  const hasMore = shown < items.length;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((n) => Math.min(n + step, items.length));
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, step, items.length, shown]);

  if (items.length === 0) return null;

  return (
    <section className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 sm:p-6 mb-6">
      <h2 className="text-base font-bold text-[var(--c-ink)] mb-4">
        {tr("สินค้าของผู้ใช้รายนี้")}
        <span className="ml-2 text-xs font-normal text-[var(--c-muted)]">
          {tr("{0} รายการ", [total])}
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.slice(0, shown).map((it) => (
          <a
            key={it.id}
            href={it.href}
            className="group block rounded-xl border border-[var(--c-line)] overflow-hidden hover:border-[var(--c-line-str)] transition"
          >
            <div className="aspect-square bg-[var(--c-subtle-2)] flex items-center justify-center overflow-hidden">
              {it.imageUrl
                ? <img src={it.imageUrl} alt={it.title} className="w-full h-full object-contain" />
                : <span className="text-3xl opacity-50">{it.emoji ?? "📦"}</span>}
            </div>
            <div className="p-2.5">
              <p className="text-[12.5px] font-medium text-[var(--c-ink)] line-clamp-2 leading-snug group-hover:text-[var(--c-accent)]">
                {it.title}
              </p>
              <p className={`text-[13px] font-bold mt-1 ${it.isRent ? "text-[var(--c-accent-str)]" : "text-[var(--c-ink)]"}`}>
                {it.priceLabel}
              </p>
              <p className="text-[11px] text-[var(--c-muted)] truncate mt-0.5">
                {it.categoryTh}{it.location ? ` · ${it.location}` : ""}
              </p>
            </div>
          </a>
        ))}
      </div>

      {hasMore && (
        <>
          <div ref={sentinel} aria-hidden className="h-px" />
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={() => setShown((n) => Math.min(n + step, items.length))}
              className="ui-btn"
            >
              {tr("ดูเพิ่ม")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
