"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

interface StatsBarProps {
  totalItems: number;
}

/**
 * Dense metadata strip — hairline-divided, not three floating cards.
 * Numbers are monospace so they line up as data.
 */
export default function StatsBar({ totalItems }: StatsBarProps) {
  const t = useLocaleStore((s) => s.t);

  const stats = [
    { value: totalItems.toLocaleString(), label: t("stat_listings") },
    { value: "347",                       label: t("stat_sellers")  },
    { value: "98%",                       label: t("stat_sat")      },
  ];

  return (
    <div className="border-y border-[var(--hp-border)] mb-12">
      <div className="grid grid-cols-3 divide-x divide-[var(--hp-border)]">
        {stats.map((s, i) => (
          <div key={s.label} className={`hp-stat py-4 ${i === 0 ? "pr-5" : "px-5"}`}>
            <p className="hp-stat-value">{s.value}</p>
            <p className="hp-stat-label">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
