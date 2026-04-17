"use client";

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
        <label className="block text-xs font-semibold text-[#555] mb-1.5">
          วันเริ่มเช่า <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={startDate}
          min={today}
          max={maxStart}
          onChange={(e) => handleStartChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-[#e5e3de] rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a]"
        />
        <p className="text-[11px] text-[#999] mt-1">เริ่มเช่าได้ตั้งแต่วันนี้เป็นต้นไป</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#555] mb-1.5">
          วันสิ้นสุดเช่า (วันคืนของ) <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={endDate}
          min={minEnd}
          max={maxEnd}
          onChange={(e) => handleEndChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-[#e5e3de] rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a]"
        />
        <p className="text-[11px] text-[#999] mt-1">
          เช่าได้ {item.minRentalDays}–{item.maxRentalDays} วัน
        </p>
        {daysError && (
          <p className="text-xs text-red-600 mt-1">
            {rentalDays < item.minRentalDays
              ? `ต้องเช่าขั้นต่ำ ${item.minRentalDays} วัน`
              : `เช่าได้สูงสุด ${item.maxRentalDays} วัน`}
          </p>
        )}
      </div>

      {rentalDays > 0 && !daysError && (
        <>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-sm">
            <span className="text-blue-600 font-bold">📅 {rentalDays} วัน</span>
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
