"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

interface StatsBarProps {
  totalItems: number;
}

/** Slim panel of platform numbers, sitting between the mosaic and the sections. */
export default function StatsBar({ totalItems }: StatsBarProps) {
  const t = useLocaleStore((s) => s.t);

  const stats = [
    { value: totalItems.toLocaleString(), label: t("stat_listings") },
    { value: "347",                       label: t("stat_sellers")  },
    { value: "98%",                       label: t("stat_sat")      },
  ];

  return (
    <div className="hp-panel !py-3.5 mb-5">
      <div className="grid grid-cols-3 divide-x divide-[var(--hp-border)]">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5 ${i === 0 ? "pr-4" : "px-4"}`}>
            <span className="hp-stat-value !text-[19px]">{s.value}</span>
            <span className="hp-stat-label !mt-0">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
