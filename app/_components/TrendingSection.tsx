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
        el.scrollBy({ left: 280, behavior: "smooth" });
      }
    }, 3000);
  }, []);

  useEffect(() => {
    if (items.length > 3) startAutoScroll();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [items.length, startAutoScroll]);

  if (items.length === 0) return null;

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">กำลังมาแรงในขณะนี้</h2>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#e8500a]">
          <span className="w-2 h-2 bg-[#e8500a] rounded-full animate-pulse" />
          Live
        </span>
      </div>

      {/* Scroll container */}
      <div
        className="relative group/section"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={() => { pausedRef.current = false; }}
      >
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide
                     -mx-4 px-4 sm:-mx-6 sm:px-6"
        >
          {items.map((featured) => (
            <TrendingCard
              key={featured.id}
              featured={featured}
              onClick={() => onItemClick?.(featured.item.id)}
            />
          ))}
        </div>

        {/* Scroll arrows (desktop) */}
        {items.length > 3 && (
          <>
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
              className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2
                         w-10 h-10 bg-white/90 border border-[#e5e3de] rounded-full
                         items-center justify-center shadow-lg text-[#555] hover:text-[#111]
                         opacity-0 group-hover/section:opacity-100 transition-opacity z-10"
              aria-label="เลื่อนซ้าย"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2
                         w-10 h-10 bg-white/90 border border-[#e5e3de] rounded-full
                         items-center justify-center shadow-lg text-[#555] hover:text-[#111]
                         opacity-0 group-hover/section:opacity-100 transition-opacity z-10"
              aria-label="เลื่อนขวา"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
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
    <button
      onClick={onClick}
      className="relative flex-shrink-0 w-[200px] sm:w-[240px] lg:w-[260px] h-[280px] sm:h-[320px] rounded-2xl overflow-hidden
                 snap-start cursor-pointer group transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/40"
    >
      {/* Image */}
      {mainImage ? (
        <Image
          src={mainImage.url}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 200px, (max-width: 1024px) 240px, 260px"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0ede7] to-[#e5e3de] flex items-center justify-center">
          <span className="text-5xl">{item.category.emoji ?? "📦"}</span>
        </div>
      )}

      {/* Badge — top left */}
      <div className="absolute top-3 left-3 z-10">
        <span className="inline-flex items-center gap-1 bg-[#e8500a] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
          🔥 {customLabel ?? "มาแรง"}
        </span>
      </div>

      {/* View count — top right */}
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
          👁 {item.viewCount.toLocaleString()}
        </span>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content — bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <p className="text-white text-sm font-bold line-clamp-2 leading-tight mb-1">
          {item.title}
        </p>
        <p className="text-white/90 text-base font-extrabold">
          ฿{item.price.toLocaleString()}
        </p>
        {item.seller.name && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {item.seller.verificationStatus === "APPROVED" && (
              <span className="text-[10px]">✅</span>
            )}
            <p className="text-white/60 text-[11px] truncate">{item.seller.name}</p>
          </div>
        )}
      </div>
    </button>
  );
}
