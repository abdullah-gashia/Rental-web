"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { PaginationMeta } from "../_lib/types";

interface PaginationProps {
  meta: PaginationMeta;
}

export default function Pagination({ meta }: PaginationProps) {
  const tr = useTr();
  const router     = useRouter();
  const sp         = useSearchParams();
  const pathname   = usePathname();
  const { currentPage, totalPages, totalCount, pageSize } = meta;

  function goTo(page: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  // Build visible page list with ellipsis
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    const from = Math.max(2, currentPage - 1);
    const to   = Math.min(totalPages - 1, currentPage + 1);
    for (let i = from; i <= to; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const from = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const to   = Math.min(currentPage * pageSize, totalCount);

  const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition";
  const btnActive = "bg-[var(--c-accent)] text-white";
  const btnIdle   = "text-[var(--c-ink-2)] hover:bg-[var(--c-line-soft)]";
  const btnDisabled = "text-[var(--c-line-str)] cursor-not-allowed";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <p className="text-sm text-[var(--c-ink-3)]">{tr("แสดง")}<span className="font-medium text-[var(--c-ink-1)]">{from}–{to}</span>{" "}
        จาก <span className="font-medium text-[var(--c-ink-1)]">{totalCount.toLocaleString()}</span>{tr("รายการ")}</p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnIdle}`}
          aria-label={tr("หน้าก่อน")}
        >
          ‹
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`d${i}`} className="w-8 text-center text-[var(--c-faint)] text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p as number)}
              className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnIdle}`}
          aria-label={tr("หน้าถัดไป")}
        >
          ›
        </button>
      </div>
    </div>
  );
}
