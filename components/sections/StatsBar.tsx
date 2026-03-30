"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

interface StatsBarProps {
  totalItems: number;
}

export default function StatsBar({ totalItems }: StatsBarProps) {
  const t = useLocaleStore((s) => s.t);

  return (
    <div className="grid grid-cols-3 gap-3 mb-12">
      <div className="bg-white border border-[#e5e3de] rounded-2xl p-4 text-center">
        <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
        <p className="text-xs text-[#9a9590] mt-0.5">{t("stat_listings")}</p>
      </div>
      <div className="bg-white border border-[#e5e3de] rounded-2xl p-4 text-center">
        <p className="text-2xl font-bold">347</p>
        <p className="text-xs text-[#9a9590] mt-0.5">{t("stat_sellers")}</p>
      </div>
      <div className="bg-white border border-[#e5e3de] rounded-2xl p-4 text-center">
        <p className="text-2xl font-bold text-[#e8500a]">98%</p>
        <p className="text-xs text-[#9a9590] mt-0.5">{t("stat_sat")}</p>
      </div>
    </div>
  );
}
