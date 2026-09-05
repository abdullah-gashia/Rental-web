"use client";

import { useState } from "react";

/**
 * Money that stays readable at any magnitude.
 *
 * A KPI card is a fixed-width box; a figure like ฿100,000,000,000,001,040
 * overflows it and tells the reader nothing at a glance. The short form is
 * shown by default and the exact number is one click away, because an admin
 * reconciling accounts does eventually need the digits.
 */

const UNITS: { limit: number; suffix: string }[] = [
  { limit: 1e15, suffix: "Q" }, // quadrillion
  { limit: 1e12, suffix: "T" }, // trillion
  { limit: 1e9,  suffix: "B" }, // billion
  { limit: 1e6,  suffix: "M" }, // million
  { limit: 1e3,  suffix: "K" }, // thousand
];

const exact = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", maximumFractionDigits: 0,
  }).format(n);

/** Exported so the same rule can be reused (and tested) elsewhere. */
export function abbreviateBaht(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs  = Math.abs(n);

  // Below a thousand there is nothing to gain from shortening
  if (abs < 1000) return exact(n);

  const unit = UNITS.find((u) => abs >= u.limit);
  if (!unit) return exact(n);

  return `${sign}฿${(abs / unit.limit).toFixed(2)}${unit.suffix}`;
}

export default function MoneyValue({ amount }: { amount: number }) {
  const [showExact, setShowExact] = useState(false);

  const short = abbreviateBaht(amount);
  const full  = exact(amount);
  const isAbbreviated = short !== full;

  // Nothing to toggle when the number already fits
  if (!isAbbreviated) {
    return <span className="tabular-nums">{full}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setShowExact((v) => !v)}
      title={showExact ? "ย่อตัวเลข" : `ยอดจริง: ${full}`}
      className="group inline-flex items-baseline gap-1.5 text-left hover:text-[var(--c-accent)] transition-colors"
    >
      <span className={`tabular-nums ${showExact ? "text-lg break-all" : ""}`}>
        {showExact ? full : short}
      </span>
      <span className="text-[10px] font-semibold text-[var(--c-faint)] group-hover:text-[var(--c-accent)] whitespace-nowrap flex-shrink-0">
        {showExact ? "ย่อ" : "ดูยอดจริง"}
      </span>
    </button>
  );
}
