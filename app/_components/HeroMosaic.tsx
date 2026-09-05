"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import type { FeaturedItemDisplay } from "@/lib/actions/featured";

interface Props {
  items: FeaturedItemDisplay[];
  onItemClick?: (itemId: string) => void;
}

/**
 * The Store-style opening mosaic: one rotating spotlight on the left,
 * one tall card and two short cards stacked on the right.
 */
export default function HeroMosaic({ items, onItemClick }: Props) {
  const tr = useTr();
  // The spotlight rotates through everything that isn't pinned to the side grid
  const sideItems      = items.slice(0, 3);
  const spotlightItems = items.length > 3 ? items.slice(3) : items;

  const [index, setIndex]  = useState(0);
  const pausedRef          = useRef(false);
  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number) => {
    if (spotlightItems.length === 0) return;
    setIndex(((next % spotlightItems.length) + spotlightItems.length) % spotlightItems.length);
  }, [spotlightItems.length]);

  useEffect(() => {
    if (spotlightItems.length < 2) return;
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % spotlightItems.length);
    }, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [spotlightItems.length]);

  if (items.length === 0) return null;

  const spotlight = spotlightItems[index];

  return (
    <div className="mb-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-3 lg:h-[440px] xl:h-[490px]">
        {/* ── Spotlight ─────────────────────────────────────────── */}
        <div
          className="relative h-[260px] sm:h-[340px] lg:h-auto"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
        >
          <SpotlightCard
            featured={spotlight}
            onClick={() => onItemClick?.(spotlight.item.id)}
          />

          {spotlightItems.length > 1 && (
            <>
              <button
                className="hp-arrow hp-arrow-float absolute left-3 top-1/2 -translate-y-1/2 z-10"
                onClick={() => go(index - 1)}
                aria-label={tr("ก่อนหน้า")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="hp-arrow hp-arrow-float absolute right-3 top-1/2 -translate-y-1/2 z-10"
                onClick={() => go(index + 1)}
                aria-label={tr("ถัดไป")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── Side grid ─────────────────────────────────────────── */}
        {sideItems.length > 0 && (
          <div className="hidden lg:grid grid-rows-[1.25fr_1fr] gap-3">
            <MiniCard
              featured={sideItems[0]}
              size="lg"
              onClick={() => onItemClick?.(sideItems[0].item.id)}
            />
            <div className="grid grid-cols-2 gap-3">
              {sideItems.slice(1, 3).map((f) => (
                <MiniCard
                  key={f.id}
                  featured={f}
                  size="sm"
                  onClick={() => onItemClick?.(f.item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dot pager */}
      {spotlightItems.length > 1 && (
        <div className="hp-dots mt-3">
          {spotlightItems.map((f, i) => (
            <button
              key={f.id}
              className={`hp-dot ${i === index ? "active" : ""}`}
              onClick={() => go(i)}
              aria-label={tr("สไลด์ที่ {0}", [i + 1])}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Spotlight ────────────────────────────────────────────────────────────────

function SpotlightCard({ featured, onClick }: { featured: FeaturedItemDisplay; onClick: () => void }) {
  const tr = useTr();
  const { item, customLabel } = featured;
  const img = item.images.find((i) => i.isMain) ?? item.images[0];

  return (
    <button onClick={onClick} className="hp-hero-card">
      {img ? (
        <Image
          src={img.url}
          alt={item.title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 62vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-40">
          {item.category.emoji ?? "📦"}
        </div>
      )}
      <div className="hp-hero-scrim" />

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 z-10">
        <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-[var(--c-surface)]/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-semibold mb-3">
          {customLabel ?? tr("กำลังมาแรง")}
        </span>

        <h2 className="text-white text-[26px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight line-clamp-2 max-w-[80%]">
          {item.title}
        </h2>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <span className="hp-btn bg-[var(--c-surface)] text-[var(--psu-navy)] hover:bg-[var(--c-surface)]/90 h-9 px-5">{tr("ดูรายละเอียด")}</span>
          <span className="hp-num text-white text-[15px] font-medium">
            ฿{item.price.toLocaleString()}
          </span>
          {item.seller.name && (
            <span className="text-white/70 text-[12.5px] flex items-center gap-1.5">
              <span className="w-px h-3.5 bg-[var(--c-surface)]/25" />
              {item.seller.name}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Side cards ───────────────────────────────────────────────────────────────

function MiniCard({
  featured,
  size,
  onClick,
}: {
  featured: FeaturedItemDisplay;
  size: "lg" | "sm";
  onClick: () => void;
}) {
  const { item } = featured;
  const img = item.images.find((i) => i.isMain) ?? item.images[0];

  return (
    <button onClick={onClick} className="hp-hero-card">
      {img ? (
        <Image
          src={img.url}
          alt={item.title}
          fill
          className="object-cover"
          sizes={size === "lg" ? "36vw" : "18vw"}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">
          {item.category.emoji ?? "📦"}
        </div>
      )}
      <div className="hp-hero-scrim" />

      <div className="absolute inset-x-0 bottom-0 p-4 z-10">
        <p
          className={`text-white font-semibold leading-tight line-clamp-2 ${
            size === "lg" ? "text-[17px]" : "text-[14px]"
          }`}
        >
          {item.title}
        </p>
        <p className="hp-num text-white/75 text-[12.5px] mt-1">
          ฿{item.price.toLocaleString()}
        </p>
      </div>
    </button>
  );
}
