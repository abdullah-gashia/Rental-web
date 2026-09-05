"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchFiltersProps {
  totalCount:        number;
  initialMinPrice?:  string;
  initialMaxPrice?:  string;
  initialCondition?: string;
  initialSort?:      string;
}

const CONDITION_LABELS: Record<string, string> = {
  LIKE_NEW:     "เหมือนใหม่",
  GOOD:         "ดี",
  FAIR:         "พอใช้",
  NEEDS_REPAIR: "ต้องซ่อม",
};

const SORT_LABELS: Record<string, string> = {
  newest:     "ใหม่สุด",
  price_asc:  "ราคา ต่ำ → สูง",
  price_desc: "ราคา สูง → ต่ำ",
  rating:     "คะแนนสูงสุด",
};

export default function SearchFilters({
  totalCount,
  initialMinPrice  = "",
  initialMaxPrice  = "",
  initialCondition = "",
  initialSort      = "newest",
}: SearchFiltersProps) {
  const tr = useLocaleStore((s) => s.tr);
  const router     = useRouter();
  // useSearchParams() is always in sync with the live URL — no stale reads
  const urlParams  = useSearchParams();

  const [minPrice,  setMinPrice]  = useState(initialMinPrice);
  const [maxPrice,  setMaxPrice]  = useState(initialMaxPrice);
  const [condition, setCondition] = useState(initialCondition);
  const [sort,      setSort]      = useState(initialSort || "newest");

  // Prevent the price debounce from firing on initial mount
  const priceDidMount = useRef(false);

  // ── URL builder ───────────────────────────────────────────────────────
  // Always start from the live urlParams so we never clobber q / cat
  function buildURL(overrides: Record<string, string>): string {
    const params = new URLSearchParams(urlParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v && !(k === "sort" && v === "newest")) {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    }
    return `/?${params.toString()}`;
  }

  // ── Price debounce — skips first render ───────────────────────────────
  useEffect(() => {
    // Skip the very first execution (component mount)
    if (!priceDidMount.current) {
      priceDidMount.current = true;
      return;
    }

    const t = setTimeout(() => {
      router.replace(buildURL({ minPrice, maxPrice }), { scroll: false });
    }, 600);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice]);

  // ── Also apply price when user presses Enter ──────────────────────────
  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      router.replace(buildURL({ minPrice, maxPrice }), { scroll: false });
    }
  }

  // ── Immediate apply helpers ───────────────────────────────────────────
  function applyCondition(val: string) {
    setCondition(val);
    router.replace(buildURL({ condition: val }), { scroll: false });
  }

  function applySort(val: string) {
    setSort(val);
    router.replace(buildURL({ sort: val }), { scroll: false });
  }

  function clearAll() {
    setMinPrice(""); setMaxPrice(""); setCondition(""); setSort("newest");
    const params = new URLSearchParams(urlParams.toString());
    ["minPrice", "maxPrice", "condition", "sort"].forEach((k) => params.delete(k));
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  const hasFilters = !!(minPrice || maxPrice || condition || sort !== "newest");

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Result count */}
      <span className="text-[13px] text-[var(--hp-muted)] mr-auto">
        <strong className="hp-num text-[var(--hp-ink)] font-medium">{totalCount}</strong>{tr("รายการ")}</span>

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <label className="text-[12px] text-[var(--hp-muted)] hidden sm:block">{tr("เรียง")}</label>
        <select
          value={sort}
          onChange={(e) => applySort(e.target.value)}
          className="hp-field hp-select"
          aria-label={tr("เรียงลำดับ")}
        >
          {Object.entries(SORT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{tr(v)}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <select
        value={condition}
        onChange={(e) => applyCondition(e.target.value)}
        className="hp-field hp-select"
        aria-label={tr("สภาพสินค้า")}
      >
        <option value="">{tr("สภาพทั้งหมด")}</option>
        {Object.entries(CONDITION_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{tr(v)}</option>
        ))}
      </select>

      {/* Price range — one grouped control, like a real filter bar */}
      <div className="flex items-center h-8 rounded-md border border-[var(--hp-border)] bg-[var(--c-surface)] overflow-hidden">
        <span className="text-[12px] text-[var(--hp-muted)] pl-2.5 pr-1.5 hidden sm:block">{`฿`}</span>
        <input
          type="number"
          min={0}
          placeholder={tr("ต่ำสุด")}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
          aria-label={tr("ราคาต่ำสุด")}
          className="hp-num w-[74px] h-full px-2 text-[13px] bg-transparent border-0 focus:outline-none placeholder:font-sans placeholder:text-[var(--c-muted)]"
        />
        <span className="w-px h-4 bg-[var(--hp-border)]" />
        <input
          type="number"
          min={0}
          placeholder={tr("สูงสุด")}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
          aria-label={tr("ราคาสูงสุด")}
          className="hp-num w-[74px] h-full px-2 text-[13px] bg-transparent border-0 focus:outline-none placeholder:font-sans placeholder:text-[var(--c-muted)]"
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <button onClick={clearAll} className="hp-btn hp-btn-ghost h-8 text-[12px]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
          </svg>{tr("ล้างตัวกรอง")}</button>
      )}
    </div>
  );
}
