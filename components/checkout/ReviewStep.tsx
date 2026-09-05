"use client";

import type { CheckoutState, CheckoutAction } from "./useCheckoutReducer";
import { getPriceBreakdown } from "@/lib/utils/pricing";

interface ReviewStepProps {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  itemPrice: number;
  itemTitle: string;
  sellerName: string | null;
}

export default function ReviewStep({
  state,
  dispatch,
  itemPrice,
  itemTitle,
  sellerName,
}: ReviewStepProps) {
  const deliveryMethod = state.deliveryMethod ?? "SHIPPING";
  const paymentMethod = state.paymentMethod ?? "ESCROW";
  const breakdown = getPriceBreakdown(itemPrice, deliveryMethod, paymentMethod);
  const addr = state.shippingAddress;

  return (
    <div className="fade-up space-y-4">
      <h3 className="text-base font-bold text-[#0f1e35]">📋 ตรวจสอบคำสั่งซื้อ</h3>

      {/* Item */}
      <div className="rounded-xl bg-[#f1f5fb] border border-[#dfe7f2] p-3">
        <p className="text-sm font-bold text-[#0f1e35]">{itemTitle}</p>
        <p className="text-xs text-[#64748b]">ขายโดย: {sellerName ?? "ไม่ระบุชื่อ"}</p>
      </div>

      {/* Delivery summary */}
      <div className="rounded-xl border border-[#dfe7f2] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#0f1e35]">การจัดส่ง</p>
          <button
            onClick={() => dispatch({ type: "GO_TO_STEP", payload: 1 })}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            แก้ไข
          </button>
        </div>

        {deliveryMethod === "SHIPPING" && addr ? (
          <div className="text-sm text-[#3d4d66] space-y-0.5">
            <p className="flex items-center gap-1.5">
              <span>🚚</span>
              <span className="font-semibold">จัดส่งถึงที่อยู่</span>
            </p>
            <p>{addr.recipientName}, {addr.phone}</p>
            <p>{addr.addressLine1}</p>
            {addr.addressLine2 && <p>{addr.addressLine2}</p>}
            <p>{addr.district}, {addr.province} {addr.postalCode}</p>
            {addr.note && <p className="text-[#64748b] italic">"{addr.note}"</p>}
          </div>
        ) : deliveryMethod === "MEETUP" ? (
          <div className="text-sm text-[#3d4d66] space-y-0.5">
            <p className="flex items-center gap-1.5">
              <span>🤝</span>
              <span className="font-semibold">นัดรับสินค้า</span>
            </p>
            <p>📍 {state.meetupLocation}</p>
            {state.meetupDateTime && (
              <p>
                🕐{" "}
                {new Date(state.meetupDateTime).toLocaleDateString("th-TH", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {state.meetupNote && <p className="text-[#64748b] italic">"{state.meetupNote}"</p>}
          </div>
        ) : null}
      </div>

      {/* Payment summary */}
      <div className="rounded-xl border border-[#dfe7f2] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#0f1e35]">การชำระเงิน</p>
          <button
            onClick={() => dispatch({ type: "GO_TO_STEP", payload: 2 })}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            แก้ไข
          </button>
        </div>
        <p className="text-sm text-[#3d4d66]">
          {paymentMethod === "ESCROW" ? (
            <span>💳 Escrow (กักเงินจนกว่าจะรับของ)</span>
          ) : (
            <span>💵 จ่ายเงินสด ({deliveryMethod === "SHIPPING" ? "เก็บเงินปลายทาง" : "จ่ายตอนนัดรับ"})</span>
          )}
        </p>
      </div>

      {/* Price breakdown */}
      <div className="rounded-xl border border-[#dfe7f2] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#3d4d66]">ราคาสินค้า</span>
          <span>฿{breakdown.itemPrice.toLocaleString()}</span>
        </div>
        {breakdown.shippingCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#3d4d66]">ค่าจัดส่ง</span>
            <span>฿{breakdown.shippingCost.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-[#3d4d66]">
            ค่าธรรมเนียม {paymentMethod === "ESCROW" ? "(5%)" : ""}
          </span>
          <span>
            {breakdown.platformFee > 0
              ? `฿${breakdown.platformFee.toLocaleString()}`
              : "฿0 (ฟรี)"}
          </span>
        </div>
        <div className="flex justify-between text-base font-extrabold text-[#0f1e35] border-t border-[#dfe7f2] pt-2">
          <span>รวมทั้งสิ้น</span>
          <span>฿{breakdown.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Terms checkbox */}
      <label className="flex items-start gap-2.5 cursor-pointer bg-[#f1f5fb] rounded-xl px-4 py-3 border border-[#dfe7f2]">
        <input
          type="checkbox"
          checked={state.termsAccepted}
          onChange={() => dispatch({ type: "TOGGLE_TERMS" })}
          className="mt-0.5 rounded"
        />
        <span className="text-xs text-[#3d4d66] leading-relaxed">
          ฉันยอมรับเงื่อนไขการซื้อขายของ PSU Store{" "}
          <span className="text-red-500">*</span>
        </span>
      </label>
    </div>
  );
}
