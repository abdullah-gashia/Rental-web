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
      <h3 className="text-base font-bold text-[var(--c-ink)]">📋 ตรวจสอบคำสั่งซื้อ</h3>

      {/* Item */}
      <div className="rounded-xl bg-[var(--c-canvas)] border border-[var(--c-line)] p-3">
        <p className="text-sm font-bold text-[var(--c-ink)]">{itemTitle}</p>
        <p className="text-xs text-[var(--c-muted)]">ขายโดย: {sellerName ?? "ไม่ระบุชื่อ"}</p>
      </div>

      {/* Delivery summary */}
      <div className="rounded-xl border border-[var(--c-line)] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[var(--c-ink)]">การจัดส่ง</p>
          <button
            onClick={() => dispatch({ type: "GO_TO_STEP", payload: 1 })}
            className="text-xs text-[var(--c-accent)] font-semibold hover:underline"
          >
            แก้ไข
          </button>
        </div>

        {deliveryMethod === "SHIPPING" && addr ? (
          <div className="text-sm text-[var(--c-ink-2)] space-y-0.5">
            <p className="flex items-center gap-1.5">
              <span>🚚</span>
              <span className="font-semibold">จัดส่งถึงที่อยู่</span>
            </p>
            <p>{addr.recipientName}, {addr.phone}</p>
            <p>{addr.addressLine1}</p>
            {addr.addressLine2 && <p>{addr.addressLine2}</p>}
            <p>{addr.district}, {addr.province} {addr.postalCode}</p>
            {addr.note && <p className="text-[var(--c-muted)] italic">"{addr.note}"</p>}
          </div>
        ) : deliveryMethod === "MEETUP" ? (
          <div className="text-sm text-[var(--c-ink-2)] space-y-0.5">
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
            {state.meetupNote && <p className="text-[var(--c-muted)] italic">"{state.meetupNote}"</p>}
          </div>
        ) : null}
      </div>

      {/* Payment summary */}
      <div className="rounded-xl border border-[var(--c-line)] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[var(--c-ink)]">การชำระเงิน</p>
          <button
            onClick={() => dispatch({ type: "GO_TO_STEP", payload: 2 })}
            className="text-xs text-[var(--c-accent)] font-semibold hover:underline"
          >
            แก้ไข
          </button>
        </div>
        <p className="text-sm text-[var(--c-ink-2)]">
          {paymentMethod === "ESCROW" ? (
            <span>💳 Escrow (กักเงินจนกว่าจะรับของ)</span>
          ) : (
            <span>💵 จ่ายเงินสด ({deliveryMethod === "SHIPPING" ? "เก็บเงินปลายทาง" : "จ่ายตอนนัดรับ"})</span>
          )}
        </p>
      </div>

      {/* Price breakdown */}
      <div className="rounded-xl border border-[var(--c-line)] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--c-ink-2)]">ราคาสินค้า</span>
          <span>฿{breakdown.itemPrice.toLocaleString()}</span>
        </div>
        {breakdown.shippingCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--c-ink-2)]">ค่าจัดส่ง</span>
            <span>฿{breakdown.shippingCost.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-[var(--c-ink-2)]">
            ค่าธรรมเนียม {paymentMethod === "ESCROW" ? "(5%)" : ""}
          </span>
          <span>
            {breakdown.platformFee > 0
              ? `฿${breakdown.platformFee.toLocaleString()}`
              : "฿0 (ฟรี)"}
          </span>
        </div>
        <div className="flex justify-between text-base font-extrabold text-[var(--c-ink)] border-t border-[var(--c-line)] pt-2">
          <span>รวมทั้งสิ้น</span>
          <span>฿{breakdown.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Terms checkbox */}
      <label className="flex items-start gap-2.5 cursor-pointer bg-[var(--c-canvas)] rounded-xl px-4 py-3 border border-[var(--c-line)]">
        <input
          type="checkbox"
          checked={state.termsAccepted}
          onChange={() => dispatch({ type: "TOGGLE_TERMS" })}
          className="mt-0.5 rounded"
        />
        <span className="text-xs text-[var(--c-ink-2)] leading-relaxed">
          ฉันยอมรับเงื่อนไขการซื้อขายของ PSU Store{" "}
          <span className="text-[var(--c-danger)]">*</span>
        </span>
      </label>
    </div>
  );
}
