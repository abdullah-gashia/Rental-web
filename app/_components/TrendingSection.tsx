"use client";

import Image from "next/image";
import { useRef, useEffect, useCallback } from "react";
import type { FeaturedItemDisplay } from "@/lib/actions/featured";

interface Props {
  items: FeaturedItemDisplay[];
  onItemClick?: (itemId: string) => void;
}

export default function TrendingSection({ items, onItemClick }: Props) {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const pausedRef   = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      // When we reach the end, snap back to start
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 220, behavior: "smooth" });
      }
    }, 4000);
  }, []);

  useEffect(() => {
    if (items.length > 3) startAutoScroll();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [items.length, startAutoScroll]);

  if (items.length === 0) return null;

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="border-t border-[var(--hp-border)] pt-3.5 mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="hp-eyebrow mb-1.5 flex items-center gap-1.5">
            <span className="hp-live-dot" />
            อัปเดตแบบเรียลไทม์
          </p>
          <h2 className="hp-sec-title">กำลังมาแรงในขณะนี้</h2>
        </div>

        {items.length > 3 && (
          <div className="hidden sm:flex items-center gap-1.5">
            <button className="pager-btn" onClick={() => scrollBy(-220)} aria-label="เลื่อนซ้าย">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="pager-btn" onClick={() => scrollBy(220)} aria-label="เลื่อนขวา">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Rail */}
      <div
        ref={scrollRef}
        className="hp-rail"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={() => { pausedRef.current = false; }}
      >
        {items.map((featured) => (
          <TrendingCard
            key={featured.id}
            featured={featured}
            onClick={() => onItemClick?.(featured.item.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Individual card ──────────────────────────────────────────────────────────

function TrendingCard({
  featured,
  onClick,
}: {
  featured: FeaturedItemDisplay;
  onClick: () => void;
}) {
  const { item, customLabel } = featured;
  const mainImage = item.images.find((i) => i.isMain) ?? item.images[0];

  return (
    <button onClick={onClick} className="hp-trend group">
      {/* Media */}
      <div className="hp-trend-media">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="208px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">
            {item.category.emoji ?? "📦"}
          </div>
        )}

        {/* Label — top left */}
        <div className="absolute top-2 left-2">
          <span className="hp-chip hp-chip-solid">{customLabel ?? "มาแรง"}</span>
        </div>

        {/* View count — top right */}
        <div className="absolute top-2 right-2">
          <span className="hp-chip">
            <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hp-num">{item.viewCount.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-[13px] font-medium text-[var(--hp-ink)] line-clamp-1 leading-snug">
          {item.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="hp-price">฿{item.price.toLocaleString()}</span>
          {item.seller.name && (
            <span className="text-[11.5px] text-[var(--hp-muted)] truncate max-w-[95px] flex items-center gap-1">
              {item.seller.verificationStatus === "APPROVED" && (
                <svg className="w-3 h-3 flex-shrink-0 text-[var(--psu-blue)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <span className="truncate">{item.seller.name}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
