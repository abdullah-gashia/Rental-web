"use client";

import type { RentalPricing } from "./useRentalCheckoutReducer";

interface Props {
  pricing: RentalPricing;
  lateFeePerDay?: number | null;
  compact?: boolean;
}

export default function PriceBreakdown({ pricing, lateFeePerDay, compact }: Props) {
  const { rentalDays, rentalFee, platformFee, securityDeposit, totalPaid } = pricing;

  if (compact) {
    return (
      <div className="flex justify-between items-center text-sm font-bold">
        <span className="text-[#555]">ยอดชำระทั้งหมด</span>
        <span className="text-[#e8500a] text-lg">฿{totalPaid.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#faf9f7] rounded-xl p-4 space-y-2 text-sm border border-[#f0ede7]">
      <div className="flex justify-between text-[#555]">
        <span>ค่าเช่า (฿{rentalFee / rentalDays} × {rentalDays} วัน)</span>
        <span>฿{rentalFee.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-[#555]">
        <span>ค่าธรรมเนียมระบบ (5%)</span>
        <span>฿{platformFee.toLocaleString()}</span>
      </div>
      {securityDeposit > 0 && (
        <div className="flex justify-between text-[#555]">
          <span>เงินมัดจำ <span className="text-[10px] text-green-600">(คืนหลังส่งของ)</span></span>
          <span>฿{securityDeposit.toLocaleString()}</span>
        </div>
      )}
      <div className="border-t border-[#e5e3de] pt-2 flex justify-between font-bold text-[#111]">
        <span>💰 ยอดชำระทั้งหมด</span>
        <span className="text-[#e8500a]">฿{totalPaid.toLocaleString()}</span>
      </div>

      {/* Info footnotes */}
      <div className="pt-1 space-y-1 text-[11px] text-[#999]">
        <p>• ค่าเช่า ฿{rentalFee} + ค่าธรรมเนียม ฿{platformFee} → จ่ายให้เจ้าของเมื่อคืนของ</p>
        {securityDeposit > 0 && (
          <p>• มัดจำ ฿{securityDeposit.toLocaleString()} → คืนให้คุณเมื่อของสภาพเดิม</p>
        )}
        {(lateFeePerDay ?? 0) > 0 ? (
          <p className="text-amber-600">• ค่าปรับหากคืนช้า: ฿{lateFeePerDay}/วัน</p>
        ) : (
          <p>• ไม่มีค่าปรับคืนช้า</p>
        )}
      </div>
    </div>
  );
}
