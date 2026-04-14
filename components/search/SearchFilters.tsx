"use client";

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
    <div className="flex flex-wrap items-center gap-2.5 py-3 border-b border-[#e5e3de] mb-6">
      {/* Result count */}
      <span className="text-sm text-[#777] mr-auto">
        พบ <strong className="text-[#111] font-semibold">{totalCount}</strong> รายการ
      </span>

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-[#9a9590] hidden sm:block">เรียง:</label>
        <select
          value={sort}
          onChange={(e) => applySort(e.target.value)}
          className="text-sm border border-[#e5e3de] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a] transition cursor-pointer"
        >
          {Object.entries(SORT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Price range */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#9a9590] hidden sm:block">ราคา:</span>
        <input
          type="number"
          min={0}
          placeholder="ต่ำสุด"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
          className="w-24 text-sm border border-[#e5e3de] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a] transition"
        />
        <span className="text-[#bbb] text-sm">–</span>
        <input
          type="number"
          min={0}
          placeholder="สูงสุด"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
          className="w-24 text-sm border border-[#e5e3de] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a] transition"
        />
      </div>

      {/* Condition */}
      <select
        value={condition}
        onChange={(e) => applyCondition(e.target.value)}
        className="text-sm border border-[#e5e3de] rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a] transition cursor-pointer"
      >
        <option value="">สภาพทั้งหมด</option>
        {Object.entries(CONDITION_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs font-semibold text-[#e8500a] bg-[#e8500a]/8 hover:bg-[#e8500a]/15 border border-[#e8500a]/20 px-3 py-1.5 rounded-xl transition"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
