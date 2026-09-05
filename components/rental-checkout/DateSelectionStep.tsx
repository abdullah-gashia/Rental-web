"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { calcRentalDays, calcRentalPricing } from "./useRentalCheckoutReducer";
import PriceBreakdown from "./PriceBreakdown";
import type { RentalCheckoutState } from "./useRentalCheckoutReducer";

interface Props {
  state: RentalCheckoutState;
  item: {
    dailyRate: number;
    securityDeposit: number;
    minRentalDays: number;
    maxRentalDays: number;
    lateFeePerDay: number | null;
  };
  onChange: (startDate: string, endDate: string) => void;
}

export default function DateSelectionStep({ state, item, onChange }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const today = new Date().toISOString().slice(0, 10);
  const maxStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const startDate = state.startDate;
  const endDate   = state.endDate;

  // Min/max for end date
  const minEnd = (() => {
    if (!startDate) return today;
    const d = new Date(startDate);
    d.setDate(d.getDate() + item.minRentalDays);
    return d.toISOString().slice(0, 10);
  })();
  const maxEnd = (() => {
    if (!startDate) return maxStart;
    const d = new Date(startDate);
    d.setDate(d.getDate() + item.maxRentalDays);
    return d.toISOString().slice(0, 10);
  })();

  const rentalDays = calcRentalDays(startDate, endDate);
  const pricing    = calcRentalPricing(startDate, endDate, item.dailyRate, item.securityDeposit);

  const handleStartChange = (val: string) => {
    // If new start > current end, push end forward
    const newEnd = val > endDate ? minEnd : endDate;
    onChange(val, newEnd);
  };

  const handleEndChange = (val: string) => {
    onChange(startDate, val);
  };

  const daysError = rentalDays > 0 && (rentalDays < item.minRentalDays || rentalDays > item.maxRentalDays);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("วันเริ่มเช่า")}<span className="text-[var(--c-danger)]">*</span>
        </label>
        <input
          type="date"
          value={startDate}
          min={today}
          max={maxStart}
          onChange={(e) => handleStartChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--c-line)] rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)]"
        />
        <p className="text-[11px] text-[var(--c-faint)] mt-1">{tr("เริ่มเช่าได้ตั้งแต่วันนี้เป็นต้นไป")}</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("วันสิ้นสุดเช่า (วันคืนของ)")}<span className="text-[var(--c-danger)]">*</span>
        </label>
        <input
          type="date"
          value={endDate}
          min={minEnd}
          max={maxEnd}
          onChange={(e) => handleEndChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--c-line)] rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)]"
        />
        <p className="text-[11px] text-[var(--c-faint)] mt-1">{tr("เช่าได้ {0}–{1} วัน", [item.minRentalDays, item.maxRentalDays])}</p>
        {daysError && (
          <p className="text-xs text-[var(--c-danger)] mt-1">
            {rentalDays < item.minRentalDays
              ? tr("ต้องเช่าขั้นต่ำ {0} วัน", [item.minRentalDays])
              : tr("เช่าได้สูงสุด {0} วัน", [item.maxRentalDays])}
          </p>
        )}
      </div>

      {rentalDays > 0 && !daysError && (
        <>
          <div className="flex items-center gap-2 bg-[var(--c-accent-soft)] border border-blue-100 rounded-xl px-3 py-2 text-sm">
            <span className="text-[var(--c-accent)] font-bold">{tr("📅 {0} วัน", [rentalDays])}</span>
            <span className="text-blue-500 text-xs">
              ({new Date(startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              {" – "}
              {new Date(endDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })})
            </span>
          </div>
          <PriceBreakdown pricing={pricing} lateFeePerDay={item.lateFeePerDay} />
        </>
      )}
    </div>
  );
}
