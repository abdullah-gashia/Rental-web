"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/lib/stores/locale-store";
import Navbar from "@/components/layout/Navbar";
import SideRail from "@/components/layout/SideRail";
import Footer from "@/components/layout/Footer";
import type { DirectoryUser } from "@/lib/actions/user-directory";

/** Five stars, the last one half-lit when the average lands between two. */
function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className={`inline-flex ${className}`} aria-label={`${rating.toFixed(1)} ดาว`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rounded ? "text-amber-400" : "text-[var(--hp-border-str)]"}>★</span>
      ))}
    </span>
  );
}

function trustTone(score: number) {
  if (score >= 120) return { label: "น่าเชื่อถือสูง", cls: "bg-[#e8f5ee] text-[#1f6b45] border-[#c3e3d1]" };
  if (score >= 80)  return { label: "ปกติ",          cls: "bg-[var(--hp-subtle)] text-[var(--hp-ink-2)] border-[var(--hp-border)]" };
  return              { label: "ควรระวัง",      cls: "bg-[#fff7e6] text-[#92620e] border-[#f5e3b8]" };
}

export default function UsersDirectoryClient({ users }: { users: DirectoryUser[] }) {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const th = locale !== "en";

  const [query, setQuery] = useState("");

  // The list is capped at 100 rows, so filtering in the browser keeps typing
  // instant instead of hitting the server on every keystroke.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name ?? "").toLowerCase().includes(q));
  }, [query, users]);

  const goToCategory = (cat: string) => router.push(cat === "all" ? "/" : `/?cat=${cat}`);

  return (
    <div className="hp-root min-h-screen">
      {/* The top-bar search is repurposed here: on this page it filters people */}
      <Navbar
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder={th ? "ค้นหาผู้ใช้งาน…" : "Search people…"}
        hideCategories
        activeCat="users"
        onCatChange={goToCategory}
      />
      <SideRail activeCat="users" onCatChange={goToCategory} />

      <div className="md:pl-[68px]">
        <main className="max-w-[1240px] mx-auto px-3 sm:px-5 pt-6 pb-20">
      {/* Page header */}
      <header className="mb-6">
        <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] leading-tight">
          {th ? "ผู้ใช้งานในระบบ" : "People on PSU Store"}
        </h1>
        <p className="text-[14px] text-[var(--hp-muted)] mt-1.5">
          {th
            ? "ดูคะแนนความน่าเชื่อถือและรีวิวของผู้ขายก่อนตัดสินใจซื้อ"
            : "Check a seller's trust score and reviews before you buy."}
        </p>
      </header>

      {/* Result count — the search itself lives in the top bar */}
      <p className="text-[12.5px] text-[var(--hp-muted)] mb-4">
        {query.trim()
          ? (th ? `พบ ${filtered.length} คนจากคำค้น “${query.trim()}”` : `${filtered.length} match “${query.trim()}”`)
          : (th ? `ทั้งหมด ${filtered.length} คน` : `${filtered.length} people`)}
      </p>

      {/* Directory */}
      {filtered.length === 0 ? (
        <div className="hp-panel text-center py-16">
          <p className="text-[14px] text-[var(--hp-muted)]">
            {th ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา" : "No one matches that search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const tone = trustTone(u.trustScore);
            return (
              <button
                key={u.id}
                onClick={() => router.push(`/user/${u.id}`)}
                className="hp-panel !p-4 text-left hover:border-[var(--psu-sky-200)] transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[var(--psu-navy)] flex items-center justify-center text-white font-semibold">
                    {u.image
                      ? <img src={u.image} alt="" className="w-full h-full object-cover" />
                      : (u.name ?? "U")[0].toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-semibold text-[var(--hp-ink)] truncate group-hover:text-[var(--psu-indigo)]">
                        {u.name ?? (th ? "ผู้ใช้" : "User")}
                      </p>
                      {u.verified && (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--psu-blue)]" fill="currentColor" viewBox="0 0 20 20" aria-label="ยืนยันตัวตนแล้ว">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {u.reviewCount > 0 ? (
                        <>
                          <Stars rating={u.avgRating ?? 0} className="text-[13px]" />
                          <span className="hp-num text-[12px] font-medium text-[var(--hp-ink)]">
                            {(u.avgRating ?? 0).toFixed(1)}
                          </span>
                          <span className="text-[11px] text-[var(--hp-muted)]">({u.reviewCount})</span>
                        </>
                      ) : (
                        <span className="text-[11.5px] text-[var(--hp-muted)]">
                          {th ? "ยังไม่มีรีวิว" : "No reviews yet"}
                        </span>
                      )}
                    </div>

                    {/* Trust + activity */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border ${tone.cls}`}>
                        {th ? tone.label : `Trust ${u.trustScore}`} · {u.trustScore}
                      </span>
                      <span className="text-[11px] text-[var(--hp-muted)]">
                        {th ? `ประกาศ ${u.itemCount} · ขายสำเร็จ ${u.soldCount}` : `${u.itemCount} listings · ${u.soldCount} sold`}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
