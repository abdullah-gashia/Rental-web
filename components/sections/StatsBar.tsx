"use client";

import { useT, useTr } from "@/lib/i18n/LocaleProvider";

interface StatsBarProps {
  totalItems: number;
  /** Users whose PSU identity has been approved */
  verifiedSellers: number;
  /** Mean of every review left on the platform, 0 when there are none */
  avgRating: number;
  reviewCount: number;
}

/**
 * Slim panel of platform numbers.
 *
 * Every figure here is counted from the database. The seller count and the
 * satisfaction score used to be hardcoded at 347 and 98%, which claimed a
 * platform far larger and better rated than the real one.
 */
export default function StatsBar({ totalItems, verifiedSellers, avgRating, reviewCount }: StatsBarProps) {
  const tr = useTr();
  const t = useT();

  const stats = [
    { value: totalItems.toLocaleString(),      label: t("stat_listings") },
    { value: verifiedSellers.toLocaleString(), label: t("stat_sellers")  },
    {
      // A rating out of five read as a percentage. With no reviews there is
      // nothing to report, so say so rather than invent a number.
      value: reviewCount > 0 ? `${Math.round((avgRating / 5) * 100)}%` : "—",
      label: t("stat_sat"),
    },
  ];

  return (
    <div className="hp-panel !py-3.5 mb-5">
      <div className="grid grid-cols-3 divide-x divide-[var(--hp-border)]">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5 ${i === 0 ? "pr-4" : "px-4"}`}>
            <span className="hp-stat-value !text-[19px]">{s.value}</span>
            <span className="hp-stat-label !mt-0">{tr(s.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
