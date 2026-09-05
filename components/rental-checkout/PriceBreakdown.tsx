"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import type { RentalPricing } from "./useRentalCheckoutReducer";

interface Props {
  pricing: RentalPricing;
  lateFeePerDay?: number | null;
  compact?: boolean;
}

export default function PriceBreakdown({ pricing, lateFeePerDay, compact }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const { rentalDays, rentalFee, platformFee, securityDeposit, totalPaid } = pricing;

  if (compact) {
    return (
      <div className="flex justify-between items-center text-sm font-bold">
        <span className="text-[var(--c-ink-2)]">{tr("ยอดชำระทั้งหมด")}</span>
        <span className="text-[var(--c-accent)] text-lg">฿{totalPaid.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--c-subtle)] rounded-xl p-4 space-y-2 text-sm border border-[var(--c-line-soft)]">
      <div className="flex justify-between text-[var(--c-ink-2)]">
        <span>{tr("ค่าเช่า (฿{0} × {1} วัน)", [rentalFee / rentalDays, rentalDays])}</span>
        <span>฿{rentalFee.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-[var(--c-ink-2)]">
        <span>{tr("ค่าธรรมเนียมระบบ (5%)")}</span>
        <span>฿{platformFee.toLocaleString()}</span>
      </div>
      {securityDeposit > 0 && (
        <div className="flex justify-between text-[var(--c-ink-2)]">
          <span>{tr("เงินมัดจำ")}<span className="text-[10px] text-[var(--c-ok)]">{tr("(คืนหลังส่งของ)")}</span></span>
          <span>฿{securityDeposit.toLocaleString()}</span>
        </div>
      )}
      <div className="border-t border-[var(--c-line)] pt-2 flex justify-between font-bold text-[var(--c-ink)]">
        <span>{tr("💰 ยอดชำระทั้งหมด")}</span>
        <span className="text-[var(--c-accent)]">฿{totalPaid.toLocaleString()}</span>
      </div>

      {/* Info footnotes */}
      <div className="pt-1 space-y-1 text-[11px] text-[var(--c-faint)]">
        <p>{tr("• ค่าเช่า ฿{0} + ค่าธรรมเนียม ฿{1} → จ่ายให้เจ้าของเมื่อคืนของ", [rentalFee, platformFee])}</p>
        {securityDeposit > 0 && (
          <p>{tr("• มัดจำ ฿{0} → คืนให้คุณเมื่อของสภาพเดิม", [securityDeposit.toLocaleString()])}</p>
        )}
        {(lateFeePerDay ?? 0) > 0 ? (
          <p className="text-[var(--c-warn)]">{tr("• ค่าปรับหากคืนช้า: ฿{0}/วัน", [lateFeePerDay])}</p>
        ) : (
          <p>{tr("• ไม่มีค่าปรับคืนช้า")}</p>
        )}
      </div>
    </div>
  );
}
