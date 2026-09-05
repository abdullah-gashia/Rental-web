"use client";

import type { TrFn } from "@/lib/i18n/phrases";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTr } from "@/lib/i18n/LocaleProvider";
import Navbar from "@/components/layout/Navbar";
import SideRail from "@/components/layout/SideRail";
import Footer from "@/components/layout/Footer";
import type { DirectoryUser } from "@/lib/actions/user-directory";

/** Five stars, the last one half-lit when the average lands between two. */
function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const tr = useTr();
  const rounded = Math.round(rating);
  return (
    <span className={`inline-flex ${className}`} aria-label={tr("{0} ดาว", [rating.toFixed(1)])}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rounded ? "text-amber-400" : "text-[var(--hp-border-str)]"}>★</span>
      ))}
    </span>
  );
}

function trustTone(score: number, tr: TrFn) {
  if (score >= 120) return { label: tr("น่าเชื่อถือสูง"), cls: "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]" };
  if (score >= 80)  return { label: tr("ปกติ"),          cls: "bg-[var(--hp-subtle)] text-[var(--hp-ink-2)] border-[var(--hp-border)]" };
  return              { label: tr("ควรระวัง"),      cls: "bg-[#fff7e6] text-[var(--c-warn)] border-[#f5e3b8]" };
}

export default function UsersDirectoryClient({ users }: { users: DirectoryUser[] }) {
  const tr = useTr();
  const router = useRouter();
  const locale = useLocale();
  const th = locale !== "en";

  const [query, setQuery] = useState("");
  const [kind, setKind]   = useState<"all" | "office" | "student">("all");

  const officeCount  = users.filter((u) => u.isOffice).length;
  const studentCount = users.length - officeCount;

  // The list is capped at 100 rows, so filtering in the browser keeps typing
  // instant instead of hitting the server on every keystroke.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (kind === "office"  && !u.isOffice) return false;
      if (kind === "student" &&  u.isOffice) return false;
      if (!q) return true;
      return (u.name ?? "").toLowerCase().includes(q);
    });
  }, [query, users, kind]);

  const goToCategory = (cat: string) => router.push(cat === "all" ? "/" : `/?cat=${cat}`);

  return (
    <div className="hp-root min-h-screen">
      {/* The top-bar search is repurposed here: on this page it filters people */}
      <Navbar
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder={th ? tr("ค้นหาผู้ใช้งาน…") : "Search people…"}
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
          {th ? tr("ผู้ใช้งานในระบบ") : "People on PSU Store"}
        </h1>
        <p className="text-[14px] text-[var(--hp-muted)] mt-1.5">
          {th
            ? tr("ดูคะแนนความน่าเชื่อถือและรีวิวของผู้ขายก่อนตัดสินใจซื้อ — และหาหน่วยงานที่ให้ยืมอุปกรณ์ฟรี")
            : "Check a seller's trust score and reviews, and find offices that lend equipment for free."}
        </p>
      </header>

      {/* Who to show */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { k: "all",     label: th ? tr("ทั้งหมด")    : "Everyone", n: users.length },
          { k: "office",  label: th ? tr("หน่วยงาน")   : "Offices",  n: officeCount  },
          { k: "student", label: th ? tr("นักศึกษา")   : "Students", n: studentCount },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setKind(t.k)}
            className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-full border transition ${
              kind === t.k
                ? "bg-[var(--psu-navy)] border-[var(--psu-navy)] text-white"
                : "bg-[var(--c-surface)] border-[var(--hp-border)] text-[var(--hp-ink-2)] hover:border-[var(--hp-border-str)]"
            }`}
          >
            {tr(t.label)} <span className="hp-num opacity-65">{t.n}</span>
          </button>
        ))}
      </div>

      {/* Result count — the search itself lives in the top bar */}
      <p className="text-[12.5px] text-[var(--hp-muted)] mb-4">
        {query.trim()
          ? (th ? tr("พบ {0} คนจากคำค้น “{1}”", [filtered.length, query.trim()]) : `${filtered.length} match “${query.trim()}”`)
          : (th ? tr("ทั้งหมด {0} คน", [filtered.length]) : `${filtered.length} people`)}
      </p>

      {/* Directory */}
      {filtered.length === 0 ? (
        <div className="hp-panel text-center py-16">
          <p className="text-[14px] text-[var(--hp-muted)]">
            {th ? tr("ไม่พบผู้ใช้ที่ตรงกับคำค้นหา") : "No one matches that search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const tone = trustTone(u.trustScore, tr);

            // ── An office ────────────────────────────────────────────────
            if (u.isOffice) {
              return (
                <button
                  key={u.id}
                  onClick={() => router.push(`/user/${u.id}`)}
                  className="hp-panel !p-4 text-left transition-colors group border-[var(--psu-sky-200)] bg-[linear-gradient(180deg,#f7faff,#ffffff)] hover:border-[var(--psu-blue)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--psu-blue)] flex items-center justify-center text-white">
                      {u.image
                        ? <img src={u.image} alt="" className="w-full h-full object-cover" />
                        : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M7 11V7a2 2 0 114 0v4m0 0V5.5a2 2 0 114 0V11m0 0V8.5a2 2 0 114 0V15a6 6 0 01-6 6h-2a6 6 0 01-6-6v-3.5a2 2 0 114 0V13" />
                          </svg>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold tracking-[0.09em] uppercase text-[var(--psu-blue)]">
                        {th ? tr("หน่วยงาน") : "Office"}
                      </span>
                      <p className="text-[14px] font-semibold text-[var(--hp-ink)] truncate group-hover:text-[var(--psu-indigo)]">
                        {u.name ?? (th ? tr("งานภัทร") : "Office")}
                      </p>
                      <p className="text-[11.5px] text-[var(--hp-muted)] mt-0.5 truncate">
                        {u.officeLocation ?? (th ? tr("ให้ยืมอุปกรณ์ฟรีสำหรับนักศึกษา") : "Free equipment lending")}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[#cfe0ff]">
                          {th ? tr("อุปกรณ์ {0} ชิ้น", [u.lendItemCount]) : `${u.lendItemCount} items`}
                        </span>
                        <span className="text-[11px] text-[var(--hp-muted)]">
                          {th ? tr("ให้ยืมแล้ว {0} ครั้ง", [u.lentOutCount]) : `${u.lentOutCount} loans`}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            }

            // ── A person ─────────────────────────────────────────────────
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
                        {u.name ?? (th ? tr("ผู้ใช้") : "User")}
                      </p>
                      {u.verified && (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--psu-blue)]" fill="currentColor" viewBox="0 0 20 20" aria-label={tr("ยืนยันตัวตนแล้ว")}>
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
                          {th ? tr("ยังไม่มีรีวิว") : "No reviews yet"}
                        </span>
                      )}
                    </div>

                    {/* Trust + activity */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border ${tone.cls}`}>
                        {th ? tone.label : `Trust ${u.trustScore}`} · {u.trustScore}
                      </span>
                      <span className="text-[11px] text-[var(--hp-muted)]">
                        {th ? tr("ประกาศ {0} · ขายสำเร็จ {1}", [u.itemCount, u.soldCount]) : `${u.itemCount} listings · ${u.soldCount} sold`}
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
