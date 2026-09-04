"use client";

import { useState } from "react";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; name: string | null; image: string | null };
  itemTitle: string | null;
  role: "seller" | "buyer" | null;
}

export interface Reputation {
  id: string;
  name: string | null;
  image: string | null;
  trustScore: number;
  memberSince: string;
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  totalBought: number;
  breakdown: { stars: number; count: number }[];
  profileReviews: ReviewRow[];
  orderReviews: ReviewRow[];
}

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={`${rating} ดาว`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-[#e5e3de]"}>★</span>
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function ReviewList({ reviews, empty }: { reviews: ReviewRow[]; empty: string }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-[#9a9590] py-8 text-center">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-[#f0ede7]">
      {reviews.map((r) => (
        <li key={r.id} className="py-3.5 flex gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#f0ede7] flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-[#777]">
            {r.reviewer.image
              ? <img src={r.reviewer.image} alt="" className="w-full h-full object-cover" />
              : (r.reviewer.name ?? "U")[0].toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#333]">{r.reviewer.name ?? "ผู้ใช้"}</span>
              <Stars rating={r.rating} className="text-xs" />
              <span className="text-[11px] text-[#b0ada6]">{formatDate(r.createdAt)}</span>
            </div>

            {r.itemTitle && (
              <p className="text-[11px] text-[#9a9590] mt-0.5 truncate">
                {r.role === "seller" ? "ในฐานะผู้ขาย" : "ในฐานะผู้ซื้อ"} · {r.itemTitle}
              </p>
            )}

            {r.comment && (
              <p className="text-sm text-[#555] mt-1 leading-relaxed">{r.comment}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ReputationPanel({ reputation }: { reputation: Reputation }) {
  const [tab, setTab] = useState<"orders" | "profile">("orders");

  const {
    avgRating, reviewCount, trustScore, totalSold, totalBought,
    breakdown, profileReviews, orderReviews,
  } = reputation;

  const tabs = [
    { key: "orders"  as const, label: "รีวิวจากการซื้อขาย", count: orderReviews.length },
    { key: "profile" as const, label: "รีวิวโปรไฟล์",       count: profileReviews.length },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden mb-8">
      {/* ── Summary ─────────────────────────────────── */}
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6">
        {/* Average */}
        <div className="flex-shrink-0 sm:w-44 text-center sm:text-left">
          <p className="text-xs font-semibold text-[#777] mb-1.5">คะแนนของฉัน</p>
          {reviewCount > 0 ? (
            <>
              <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                <span className="text-3xl font-bold text-[#111]">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-[#9a9590]">/ 5</span>
              </div>
              <Stars rating={Math.round(avgRating)} className="text-lg mt-0.5" />
              <p className="text-xs text-[#9a9590] mt-1">จาก {reviewCount} รีวิว</p>
            </>
          ) : (
            <>
              <Stars rating={0} className="text-lg" />
              <p className="text-xs text-[#9a9590] mt-1">ยังไม่มีรีวิว</p>
            </>
          )}
        </div>

        {/* Distribution */}
        <div className="flex-1 min-w-0">
          {reviewCount > 0 ? (
            <div className="space-y-1">
              {breakdown.map((b) => {
                const pct = reviewCount > 0 ? (b.count / reviewCount) * 100 : 0;
                return (
                  <div key={b.stars} className="flex items-center gap-2">
                    <span className="text-[11px] text-[#9a9590] w-8 flex-shrink-0">{b.stars} ดาว</span>
                    <div className="flex-1 h-2 rounded-full bg-[#f0ede7] overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-[#9a9590] w-5 text-right flex-shrink-0">{b.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#9a9590]">
              เมื่อมีคนให้คะแนนคุณ คะแนนเฉลี่ยและรีวิวจะแสดงที่นี่
            </p>
          )}
        </div>

        {/* Counters */}
        <div className="flex sm:flex-col gap-4 sm:gap-3 sm:w-36 flex-shrink-0 sm:border-l sm:border-[#f0ede7] sm:pl-5">
          {[
            { label: "คะแนนความน่าเชื่อถือ", value: trustScore },
            { label: "ขายสำเร็จ",            value: totalSold },
            { label: "ซื้อสำเร็จ",           value: totalBought },
          ].map((c) => (
            <div key={c.label}>
              <p className="text-lg font-bold text-[#111] leading-none">{c.value}</p>
              <p className="text-[11px] text-[#9a9590] mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reviews ─────────────────────────────────── */}
      <div className="border-t border-[#e5e3de]">
        <div className="flex gap-1 px-5 sm:px-6 pt-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
                tab === t.key
                  ? "border-[#e8500a] text-[#111]"
                  : "border-transparent text-[#9a9590] hover:text-[#555]"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[11px] text-[#b0ada6]">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="px-5 sm:px-6 pb-4 border-t border-[#f0ede7]">
          {tab === "orders" ? (
            <ReviewList reviews={orderReviews} empty="ยังไม่มีรีวิวจากการซื้อขาย" />
          ) : (
            <ReviewList reviews={profileReviews} empty="ยังไม่มีรีวิวบนโปรไฟล์" />
          )}
        </div>
      </div>
    </div>
  );
}
