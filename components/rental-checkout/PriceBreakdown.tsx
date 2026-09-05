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
        <span className="text-[#3d4d66]">ยอดชำระทั้งหมด</span>
        <span className="text-[#2563eb] text-lg">฿{totalPaid.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#f7f9fd] rounded-xl p-4 space-y-2 text-sm border border-[#eaf0f8]">
      <div className="flex justify-between text-[#3d4d66]">
        <span>ค่าเช่า (฿{rentalFee / rentalDays} × {rentalDays} วัน)</span>
        <span>฿{rentalFee.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-[#3d4d66]">
        <span>ค่าธรรมเนียมระบบ (5%)</span>
        <span>฿{platformFee.toLocaleString()}</span>
      </div>
      {securityDeposit > 0 && (
        <div className="flex justify-between text-[#3d4d66]">
          <span>เงินมัดจำ <span className="text-[10px] text-green-600">(คืนหลังส่งของ)</span></span>
          <span>฿{securityDeposit.toLocaleString()}</span>
        </div>
      )}
      <div className="border-t border-[#dfe7f2] pt-2 flex justify-between font-bold text-[#0f1e35]">
        <span>💰 ยอดชำระทั้งหมด</span>
        <span className="text-[#2563eb]">฿{totalPaid.toLocaleString()}</span>
      </div>

      {/* Info footnotes */}
      <div className="pt-1 space-y-1 text-[11px] text-[#8d9bb0]">
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
