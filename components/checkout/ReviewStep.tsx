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
      <h3 className="text-base font-bold text-[#111]">📋 ตรวจสอบคำสั่งซื้อ</h3>

      {/* Item */}
      <div className="rounded-xl bg-[#f7f6f3] border border-[#e5e3de] p-3">
        <p className="text-sm font-bold text-[#111]">{itemTitle}</p>
        <p className="text-xs text-[#9a9590]">ขายโดย: {sellerName ?? "ไม่ระบุชื่อ"}</p>
      </div>

      {/* Delivery summary */}
      <div className="rounded-xl border border-[#e5e3de] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#111]">การจัดส่ง</p>
          <button
            onClick={() => dispatch({ type: "GO_TO_STEP", payload: 1 })}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            แก้ไข
          </button>
        </div>

        {deliveryMethod === "SHIPPING" && addr ? (
          <div className="text-sm text-[#555] space-y-0.5">
            <p className="flex items-center gap-1.5">
              <span>🚚</span>
              <span className="font-semibold">จัดส่งถึงที่อยู่</span>
            </p>
            <p>{addr.recipientName}, {addr.phone}</p>
            <p>{addr.addressLine1}</p>
            {addr.addressLine2 && <p>{addr.addressLine2}</p>}
            <p>{addr.district}, {addr.province} {addr.postalCode}</p>
            {addr.note && <p className="text-[#9a9590] italic">"{addr.note}"</p>}
          </div>
        ) : deliveryMethod === "MEETUP" ? (
          <div className="text-sm text-[#555] space-y-0.5">
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
            {state.meetupNote && <p className="text-[#9a9590] italic">"{state.meetupNote}"</p>}
          </div>
        ) : null}
      </div>

      {/* Payment summary */}
      <div className="rounded-xl border border-[#e5e3de] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#111]">การชำระเงิน</p>
          <button
            onClick={() => dispatch({ type: "GO_TO_STEP", payload: 2 })}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            แก้ไข
          </button>
        </div>
        <p className="text-sm text-[#555]">
          {paymentMethod === "ESCROW" ? (
            <span>💳 Escrow (กักเงินจนกว่าจะรับของ)</span>
          ) : (
            <span>💵 จ่ายเงินสด ({deliveryMethod === "SHIPPING" ? "เก็บเงินปลายทาง" : "จ่ายตอนนัดรับ"})</span>
          )}
        </p>
      </div>

      {/* Price breakdown */}
      <div className="rounded-xl border border-[#e5e3de] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#555]">ราคาสินค้า</span>
          <span>฿{breakdown.itemPrice.toLocaleString()}</span>
        </div>
        {breakdown.shippingCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#555]">ค่าจัดส่ง</span>
            <span>฿{breakdown.shippingCost.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-[#555]">
            ค่าธรรมเนียม {paymentMethod === "ESCROW" ? "(5%)" : ""}
          </span>
          <span>
            {breakdown.platformFee > 0
              ? `฿${breakdown.platformFee.toLocaleString()}`
              : "฿0 (ฟรี)"}
          </span>
        </div>
        <div className="flex justify-between text-base font-extrabold text-[#111] border-t border-[#e5e3de] pt-2">
          <span>รวมทั้งสิ้น</span>
          <span>฿{breakdown.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Terms checkbox */}
      <label className="flex items-start gap-2.5 cursor-pointer bg-[#f7f6f3] rounded-xl px-4 py-3 border border-[#e5e3de]">
        <input
          type="checkbox"
          checked={state.termsAccepted}
          onChange={() => dispatch({ type: "TOGGLE_TERMS" })}
          className="mt-0.5 rounded"
        />
        <span className="text-xs text-[#555] leading-relaxed">
          ฉันยอมรับเงื่อนไขการซื้อขายของ PSU Store{" "}
          <span className="text-red-500">*</span>
        </span>
      </label>
    </div>
  );
}
