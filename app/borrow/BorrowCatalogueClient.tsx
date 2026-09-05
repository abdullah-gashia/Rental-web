"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import SideRail from "@/components/layout/SideRail";
import Footer from "@/components/layout/Footer";
import { useLocale, useT, useTr } from "@/lib/i18n/LocaleProvider";
import { borrowCategory, lendItemStatus } from "@/lib/i18n/labels";
import type { CatalogueItem } from "@/lib/actions/borrow-items";

interface Props {
  items: CatalogueItem[];
  stats: { total: number; available: number; out: number; completed: number };
  fund:  { raised: number; itemsTotal: number; timesLent: number };
  viewerRole: string | null;
}

const STATUS_PILL: Record<string, string> = {
  AVAILABLE: "bw-pill-live",
  RESERVED:  "bw-pill-wait",
  LENT_OUT:  "bw-pill-off",
};

function baht(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
}

export default function BorrowCatalogueClient({ items, stats, fund, viewerRole }: Props) {
  const tr = useTr();
  const router = useRouter();
  const t      = useT();
  const locale = useLocale();
  const [query, setQuery]   = useState("");
  const [cat, setCat]       = useState("all");
  const [onlyFree, setFree] = useState(false);

  const cats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (onlyFree && i.status !== "AVAILABLE") return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.assetTag ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, cat, onlyFree]);

  return (
    <div className="bw-root">
      <Navbar
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder={t("bw_search")}
        hideCategories
        activeCat="borrow"
        onCatChange={(c) => router.push(c === "all" ? "/" : `/?cat=${c}`)}
      />
      <SideRail activeCat="borrow" onCatChange={(c) => router.push(c === "all" ? "/" : `/?cat=${c}`)} />

      <div className="md:pl-[68px]">
        <main className="max-w-[1240px] mx-auto px-3 sm:px-5 pt-6 pb-20">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="mb-6">
            <p className="bw-label mb-2">{tr("งานภัทร · มหาวิทยาลัยสงขลานครินทร์")}</p>
            <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] leading-tight">
              {t("bw_free_title")}
            </h1>
            <p className="text-[14.5px] text-[var(--bw-muted)] mt-2 max-w-[58ch] leading-[1.9]">
{t("bw_intro")}
            </p>
          </header>

          {/* ── Where the money went ───────────────────────────────────── */}
          <section className="bw-panel mb-6 !p-0 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--bw-line)]">
              {[
                { k: t("bw_raised"), v: baht(fund.raised),            note: t("bw_raised_s") },
                { k: t("bw_became"), v: `${fund.itemsTotal}`,          note: t("bw_became_s") },
                { k: t("bw_lent"),   v: `${fund.timesLent}`,           note: t("bw_lent_s") },
              ].map((s) => (
                <div key={s.k} className="px-5 py-4">
                  <p className="bw-label">{s.k}</p>
                  <p className="bw-num text-[24px] font-semibold text-[var(--psu-navy)] mt-1 leading-none">{s.v}</p>
                  <p className="text-[11.5px] text-[var(--bw-muted)] mt-1.5">{s.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Office notice for staff / admins ───────────────────────── */}
          {(viewerRole === "PATTARA" || viewerRole === "ADMIN") && (
            <div className="bw-panel mb-6 flex flex-wrap items-center justify-between gap-3 !py-3.5">
              <p className="text-[13px] text-[var(--bw-ink-2)]">{tr("คุณกำลังดูหน้าที่นักศึกษาเห็น — จัดการคลังอุปกรณ์ได้ที่แดชบอร์ดงานภัทร")}</p>
              <a href="/pattara" className="bw-btn bw-btn-ghost !h-9">{tr("ไปที่แดชบอร์ด →")}</a>
            </div>
          )}

          {/* ── Filters ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              onClick={() => setCat("all")}
              className={`bw-pill !text-[12px] !px-3 !py-1.5 ${cat === "all" ? "bw-pill-go" : "bw-pill-done"}`}
            >
              {t("c_all")} <span className="bw-num opacity-60">{items.length}</span>
            </button>
            {cats.map(([c, n]) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`bw-pill !text-[12px] !px-3 !py-1.5 ${cat === c ? "bw-pill-go" : "bw-pill-done"}`}
              >
                {borrowCategory(locale, c)} <span className="bw-num opacity-60">{n}</span>
              </button>
            ))}

            <label className="flex items-center gap-2 ml-auto text-[12.5px] text-[var(--bw-ink-2)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyFree}
                onChange={(e) => setFree(e.target.checked)}
                className="accent-[var(--psu-blue)]"
              />
              {t("bw_only_free")}
            </label>
          </div>

          {/* ── Grid ───────────────────────────────────────────────────── */}
          {shown.length === 0 ? (
            <div className="bw-panel text-center py-16">
              <p className="text-[14px] text-[var(--bw-muted)]">
                {items.length === 0
                  ? t("bw_empty")
                  : t("bw_no_match")}
              </p>
              {items.length > 0 && (
                <button
                  onClick={() => { setQuery(""); setCat("all"); setFree(false); }}
                  className="text-[13px] font-semibold text-[var(--psu-blue)] hover:underline mt-2"
                >
                  {t("bw_clear")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {shown.map((i) => {
                const free = i.status === "AVAILABLE";
                return (
                  <a
                    key={i.id}
                    href={`/borrow/${i.id}`}
                    className="bw-panel !p-0 overflow-hidden group hover:border-[var(--psu-sky-200)] transition-colors flex flex-col"
                  >
                    <div className="bw-thumb aspect-[4/3] !rounded-none !border-0 !border-b border-[var(--bw-line)]">
                      {i.images[0]
                        ? <img src={i.images[0]} alt={i.title} loading="lazy" />
                        : <span className="text-4xl opacity-30">📦</span>}
                    </div>

                    <div className="p-3.5 flex flex-col gap-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13.5px] font-semibold leading-snug text-[var(--bw-ink)] line-clamp-2 group-hover:text-[var(--psu-indigo)]">
                          {i.title}
                        </p>
                        <span className={`bw-pill ${STATUS_PILL[i.status] ?? "bw-pill-off"} flex-shrink-0`}>
                          {lendItemStatus(locale, i.status)}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-[var(--bw-muted)]">
                        {borrowCategory(locale, i.category)}
                        {i.assetTag ? ` · ${i.assetTag}` : ""}
                      </p>

                      <div className="mt-auto pt-2 border-t border-[var(--bw-line)] flex items-center justify-between">
                        <span className={`text-[12.5px] font-semibold ${free ? "text-[var(--psu-blue)]" : "text-[var(--bw-muted)]"}`}>
                          {free ? t("bw_free") : t("bw_unavailable")}
                        </span>
                        <span className="text-[11px] text-[var(--bw-muted)]">
                          {t("bw_max_days", { n: i.maxDays })}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* ── How it works ───────────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="bw-h">{t("bw_how")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { n: 1, t: t("bw_how_1"), d: t("bw_how_1s") },
                { n: 2, t: t("bw_how_2"), d: t("bw_how_2s") },
                { n: 3, t: t("bw_how_3"), d: t("bw_how_3s") },
                { n: 4, t: t("bw_how_4"), d: t("bw_how_4s") },
              ].map((s) => (
                <div key={s.n} className="bw-panel">
                  <span className="w-7 h-7 rounded-full bg-[var(--bw-tint)] text-[var(--psu-blue-700)] text-[12px] font-bold flex items-center justify-center">
                    {s.n}
                  </span>
                  <p className="text-[13.5px] font-semibold mt-2.5">{s.t}</p>
                  <p className="text-[12px] text-[var(--bw-muted)] mt-1 leading-[1.8]">{s.d}</p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[var(--bw-muted)] mt-3">
              {t("bw_limits", { max: 3, days: 14, renew: 1 })}
            </p>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
