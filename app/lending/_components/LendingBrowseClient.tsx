"use client";

import { useState, useTransition } from "react";
import { browseLendingItems } from "@/lib/actions/lending-items";
import { LENDING_CATEGORY_LABELS, LENDING_CATEGORY_EMOJI } from "@/lib/constants/lending";
import type { LendingItemWithOwner } from "@/lib/actions/lending-items";
import LendingItemCard from "./LendingItemCard";

const CATEGORIES = [
  "ALL",
  "TEXTBOOKS",
  "LAB_EQUIPMENT",
  "ELECTRONICS",
  "TOOLS",
  "SPORTS",
  "MUSIC_INSTRUMENTS",
  "COSTUMES_OUTFITS",
  "STUDY_SUPPLIES",
  "VEHICLES",
  "OTHER",
] as const;

interface Props {
  initialItems: LendingItemWithOwner[];
}

export default function LendingBrowseClient({ initialItems }: Props) {
  const [items, setItems] = useState<LendingItemWithOwner[]>(initialItems);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("ALL");
  const [rentalType, setRentalType] = useState("ALL");
  const [pending, startTransition] = useTransition();

  function search(overrides?: { q?: string; category?: string; rentalType?: string }) {
    const params = {
      q: overrides?.q ?? q,
      category: overrides?.category ?? category,
      rentalType: overrides?.rentalType ?? rentalType,
    };
    startTransition(async () => {
      const results = await browseLendingItems(params);
      setItems(results);
    });
  }

  function handleCatChange(cat: string) {
    setCategory(cat);
    search({ category: cat });
  }

  function handleTypeChange(type: string) {
    setRentalType(type);
    search({ rentalType: type });
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-5">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="ค้นหาของที่ต้องการยืม..."
          className="w-full pl-11 pr-28 py-3 rounded-2xl border border-[#e5e3de] text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
        />
        <button
          onClick={() => search()}
          disabled={pending}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#e8500a] text-white
                     text-xs font-bold rounded-xl hover:bg-[#c94208] transition disabled:opacity-50"
        >
          {pending ? "..." : "ค้นหา"}
        </button>
      </div>

      {/* Rental type filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "ทั้งหมด" },
          { key: "FREE", label: "ฟรี" },
          { key: "DAILY_RATE", label: "รายวัน" },
          { key: "FLAT_FEE", label: "เหมา" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTypeChange(key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              rentalType === key
                ? "bg-[#e8500a] text-white border-[#e8500a]"
                : "bg-white text-[#555] border-[#e5e3de] hover:border-[#e8500a]/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCatChange(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              category === cat
                ? "bg-[#111] text-white border-[#111]"
                : "bg-white text-[#555] border-[#e5e3de] hover:border-[#aaa]"
            }`}
          >
            {cat !== "ALL" && <span>{LENDING_CATEGORY_EMOJI[cat]}</span>}
            {cat === "ALL" ? "ทุกหมวด" : LENDING_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      {pending ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-[#f0ede7] rounded-2xl h-[280px] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-[#555] font-medium">ไม่พบรายการที่ตรงกัน</p>
          <p className="text-sm text-[#aaa] mt-1">ลองค้นหาด้วยคำอื่น หรือเปลี่ยนหมวดหมู่</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <LendingItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
