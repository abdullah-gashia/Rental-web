"use client";

import { useState } from "react";
import type { RentalCheckoutState, RentalPricing } from "./useRentalCheckoutReducer";

interface Item {
  title: string;
  seller: { name: string | null };
  lateFeePerDay: number | null;
  rentalTerms: string | null;
}

interface Props {
  state: RentalCheckoutState;
  item: Item;
  pricing: RentalPricing;
  onSetAgreement: (accepted: boolean) => void;
  onGotoStep: (step: 1 | 2 | 3 | 4) => void;
}

export default function AgreementStep({ state, item, pricing, onSetAgreement, onGotoStep }: Props) {
  const [expanded, setExpanded] = useState(false);

  const startLabel = state.startDate
    ? new Date(state.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const endLabel = state.endDate
    ? new Date(state.endDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const pickupDateLabel = state.pickupDateTime
    ? new Date(state.pickupDateTime).toLocaleString("th-TH", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="space-y-3">

        {/* Dates */}
        <div className="flex items-start justify-between gap-4 bg-[#faf9f7] rounded-xl p-3.5">
          <div>
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-0.5">ระยะเวลาเช่า</p>
            <p className="text-sm font-semibold text-[#111]">
              {startLabel} – {endLabel}
              <span className="text-[#777] font-normal ml-1.5">({pricing.rentalDays} วัน)</span>
            </p>
          </div>
          <button onClick={() => onGotoStep(1)} className="text-xs text-[#e8500a] hover:underline flex-shrink-0">
            แก้ไข
          </button>
        </div>

        {/* Pickup */}
        <div className="flex items-start justify-between gap-4 bg-[#faf9f7] rounded-xl p-3.5">
          <div>
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-0.5">นัดรับ</p>
            <p className="text-sm font-semibold text-[#111]">
              📍 {state.pickupLocation || "—"}
            </p>
            <p className="text-xs text-[#777]">{pickupDateLabel}</p>
          </div>
          <button onClick={() => onGotoStep(2)} className="text-xs text-[#e8500a] hover:underline flex-shrink-0">
            แก้ไข
          </button>
        </div>

        {/* Financial */}
        <div className="bg-[#faf9f7] rounded-xl p-3.5 space-y-1.5 text-sm">
          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-2">รายละเอียดค่าใช้จ่าย</p>
          <div className="flex justify-between text-[#555]">
            <span>ค่าเช่า (฿{item.lateFeePerDay ?? pricing.rentalFee / pricing.rentalDays} × {pricing.rentalDays} วัน)</span>
            <span>฿{pricing.rentalFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[#555]">
            <span>เงินมัดจำ</span>
            <span>฿{pricing.securityDeposit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[#555]">
            <span>ค่าธรรมเนียม (5%)</span>
            <span>฿{pricing.platformFee.toLocaleString()}</span>
          </div>
          <div className="border-t border-[#e5e3de] pt-1.5 flex justify-between font-bold text-[#111]">
            <span>ยอดชำระทั้งหมด</span>
            <span className="text-[#e8500a]">฿{pricing.totalPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-[#999]">
            <span>วิธีชำระ</span>
            <span>{state.paymentMethod === "ESCROW" ? "💳 Escrow" : "💵 COD (มัดจำผ่านระบบ)"}</span>
          </div>
        </div>
      </div>

      {/* Rental Agreement */}
      <div className="border border-[#e5e3de] rounded-xl overflow-hidden">
        <div className="bg-[#f7f6f3] px-4 py-2.5 flex items-center gap-2">
          <span className="text-sm">📜</span>
          <p className="text-xs font-bold text-[#333]">เงื่อนไขการเช่า (สัญญาเช่าดิจิทัล)</p>
        </div>
        <div className={`px-4 py-3 text-xs text-[#555] space-y-1.5 leading-relaxed ${
          expanded ? "" : "max-h-40 overflow-hidden"
        }`}>
          <p>1. ผู้เช่าตกลงเช่าสินค้าตามระยะเวลาที่ระบุข้างต้น</p>
          <p>2. ผู้เช่าต้องดูแลสินค้าเสมือนของตนเอง และคืนในสภาพเดิม</p>
          <p>3. หากสินค้าชำรุดเสียหาย ผู้เช่ายินยอมให้หักค่าเสียหายจากเงินมัดจำ</p>
          <p>4. หากสินค้าสูญหาย ยินยอมให้ริบเงินมัดจำทั้งจำนวน และอาจถูกเรียกค่าเสียหายเพิ่มเติม</p>
          {(item.lateFeePerDay ?? 0) > 0 && (
            <p>5. หากคืนช้า จะถูกคิดค่าปรับ ฿{item.lateFeePerDay}/วัน นับตั้งแต่วันครบกำหนดคืน</p>
          )}
          <p>6. ทั้งสองฝ่ายยืนยันตัวตนผ่านระบบ KYC — ข้อตกลงนี้มีผลผูกพันตามกฎหมายแพ่งและพาณิชย์ ว่าด้วยการเช่าทรัพย์ (มาตรา 537–571)</p>
          <p>7. หากเกิดข้อพิพาท แพลตฟอร์มจะใช้หลักฐาน Digital Handshake (ภาพถ่ายสภาพสินค้า) ในการตัดสิน</p>
          <p>8. ค่าธรรมเนียมระบบ 5% จากค่าเช่า ไม่สามารถขอคืนได้เมื่อเจ้าของตอบรับแล้ว</p>
          {item.rentalTerms && (
            <>
              <div className="border-t border-[#e5e3de] pt-1.5 mt-1.5">
                <p className="font-semibold text-[#333] mb-1">เงื่อนไขเพิ่มเติมจากเจ้าของ:</p>
                <p className="whitespace-pre-line">{item.rentalTerms}</p>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-xs text-[#e8500a] hover:bg-[#faf9f7] transition border-t border-[#e5e3de]"
        >
          {expanded ? "ย่อลง ▲" : "อ่านเพิ่มเติม ▼"}
        </button>
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={state.agreementAccepted}
          onChange={(e) => onSetAgreement(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-[#e8500a] flex-shrink-0"
        />
        <span className="text-sm text-[#333]">
          ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขการเช่าข้างต้นทุกประการ <span className="text-red-500">*</span>
        </span>
      </label>
    </div>
  );
}
