"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import type { CheckoutState, CheckoutAction } from "./useCheckoutReducer";
import { getPriceBreakdown } from "@/lib/utils/pricing";

interface PaymentStepProps {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  itemPrice: number;
  walletBalance: number | null;
  loadingBalance: boolean;
  allowCOD: boolean;
}

export default function PaymentStep({
  state,
  dispatch,
  itemPrice,
  walletBalance,
  loadingBalance,
  allowCOD,
}: PaymentStepProps) {
  const tr = useLocaleStore((s) => s.tr);
  const deliveryMethod = state.deliveryMethod ?? "SHIPPING";
  const paymentMethod = state.paymentMethod ?? "ESCROW";

  const breakdown = getPriceBreakdown(itemPrice, deliveryMethod, paymentMethod);
  const sufficient = walletBalance !== null && walletBalance >= breakdown.totalAmount;
  const deficit = walletBalance !== null ? breakdown.totalAmount - walletBalance : 0;

  return (
    <div className="fade-up space-y-4">
      <h3 className="text-base font-bold text-[var(--c-ink)]">{tr("เลือกวิธีชำระเงิน")}</h3>

      {/* Payment method cards */}
      <div className={`grid gap-3 ${allowCOD ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Escrow */}
        <button
          onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", payload: "ESCROW" })}
          className={`checkout-card-radio text-left ${paymentMethod === "ESCROW" ? "selected" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">💳</span>
            {paymentMethod === "ESCROW" && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] text-[10px] font-bold">{tr("🏆 แนะนำ")}</span>
            )}
          </div>
          <p className="text-sm font-bold mt-1">{tr("จ่ายผ่าน Escrow")}</p>
          <p className="text-[11px] text-[var(--c-ok)] font-semibold">{tr("✅ ปลอดภัยที่สุด")}</p>
          <p className="text-[10px] text-[var(--c-muted)] mt-0.5 leading-tight">{tr("เงินจะถูกกักไว้จนกว่าคุณจะยืนยันว่าได้รับของ")}</p>
        </button>

        {/* COD */}
        {allowCOD && (
          <button
            onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", payload: "COD" })}
            className={`checkout-card-radio text-left ${paymentMethod === "COD" ? "selected" : ""}`}
          >
            <span className="text-2xl">💵</span>
            <p className="text-sm font-bold mt-1">{tr("จ่ายเงินสด")}</p>
            <p className="text-[11px] text-[var(--c-warn)] font-semibold">{tr("⚠️ ไม่มีการคุ้มครอง")}</p>
            <p className="text-[10px] text-[var(--c-muted)] mt-0.5 leading-tight">
              จ่ายตอนรับของ ({deliveryMethod === "SHIPPING" ? tr("เก็บเงินปลายทาง") : tr("จ่ายตอนนัดรับ")})
            </p>
          </button>
        )}
      </div>

      {/* Escrow details */}
      {paymentMethod === "ESCROW" && (
        <div className="rounded-xl border border-[var(--c-line-str)] bg-[var(--c-accent-soft)]/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span>💳</span>
            <span className="font-bold text-blue-800">{tr("รายละเอียดการชำระเงิน")}</span>
          </div>

          {/* Wallet balance */}
          <div className="flex justify-between text-sm">
            <span className="text-[var(--c-ink-2)]">{tr("ยอดเงินในกระเป๋า")}</span>
            {loadingBalance ? (
              <span className="text-[var(--c-muted)] animate-pulse">{tr("กำลังโหลด…")}</span>
            ) : (
              <span className={`font-bold ${sufficient ? "text-[var(--c-ok)]" : "text-[var(--c-danger)]"}`}>
                ฿{walletBalance?.toLocaleString()}
              </span>
            )}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-blue-100 pt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--c-ink-2)]">{tr("ราคาสินค้า")}</span>
              <span>฿{breakdown.itemPrice.toLocaleString()}</span>
            </div>
            {breakdown.shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--c-ink-2)]">{tr("ค่าจัดส่ง")}</span>
                <span>฿{breakdown.shippingCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--c-ink-2)]">{tr("ค่าธรรมเนียม (5%)")}</span>
              <span>฿{breakdown.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--c-ink)] border-t border-blue-100 pt-1.5">
              <span>{tr("รวมทั้งสิ้น")}</span>
              <span>฿{breakdown.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Balance status */}
          {!loadingBalance && walletBalance !== null && (
            sufficient ? (
              <div className="flex items-center gap-2 text-xs text-[var(--c-ok)] font-semibold">
                <span>✅</span>
                <span>{tr("ยอดเงินเพียงพอ — คงเหลือหลังชำระ ฿{0}", [(walletBalance - breakdown.totalAmount).toLocaleString()])}</span>
              </div>
            ) : (
              <div className="rounded-lg bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] p-3 space-y-2">
                <p className="text-xs text-[var(--c-danger)] font-semibold">{tr("⚠️ ยอดเงินไม่เพียงพอ")}</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-[var(--c-ink-2)]">{tr("ยอดที่ต้องชำระ:")}</span>
                  <span className="text-right font-bold">฿{breakdown.totalAmount.toLocaleString()}</span>
                  <span className="text-[var(--c-ink-2)]">{tr("ขาดอีก:")}</span>
                  <span className="text-right font-bold text-[var(--c-danger)]">฿{deficit.toLocaleString()}</span>
                </div>
                {allowCOD && (
                  <button
                    onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", payload: "COD" })}
                    className="w-full mt-1 py-2 rounded-lg bg-[var(--c-surface)] border border-[var(--c-line)] text-xs font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
                  >{tr("💵 เปลี่ยนเป็นจ่ายเงินสด")}</button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* COD details */}
      {paymentMethod === "COD" && (
        <div className="rounded-xl border border-[var(--c-warn-line)] bg-[var(--c-warn-soft)]/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span>⚠️</span>
            <span className="font-bold text-amber-800">{tr("คำเตือน: การจ่ายเงินสด")}</span>
          </div>
          <p className="text-xs text-[var(--c-warn)] leading-relaxed">{tr("การจ่ายเงินสดจะ")}<strong>{tr("ไม่ได้รับการคุ้มครอง")}</strong>{tr("จากระบบ Escrow หากเกิดปัญหา แพลตฟอร์มอาจไม่สามารถช่วยเหลือเรื่องการเงินได้")}</p>
          <p className="text-xs text-[var(--c-accent)]">{tr("💡 เราแนะนำให้ใช้ระบบ Escrow เพื่อความปลอดภัย")}</p>

          {/* Risk checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.codRiskAccepted}
              onChange={() => dispatch({ type: "TOGGLE_COD_RISK" })}
              className="mt-0.5 rounded"
            />
            <span className="text-xs text-[var(--c-ink-2)]">{tr("ฉันเข้าใจและยอมรับความเสี่ยง")}<span className="text-[var(--c-danger)]">*</span>
            </span>
          </label>

          {/* Price breakdown */}
          <div className="border-t border-amber-100 pt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--c-ink-2)]">{tr("ราคาสินค้า")}</span>
              <span>฿{breakdown.itemPrice.toLocaleString()}</span>
            </div>
            {breakdown.shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--c-ink-2)]">{tr("ค่าจัดส่ง")}</span>
                <span>฿{breakdown.shippingCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--c-ink-2)]">{tr("ค่าธรรมเนียม")}</span>
              <span className="text-[var(--c-ok)] font-semibold">{tr("฿0 (ฟรีสำหรับ COD)")}</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--c-ink)] border-t border-amber-100 pt-1.5">
              <span>{tr("รวมทั้งสิ้น")}</span>
              <span>฿{breakdown.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-[var(--c-muted)]">{tr("💵 ชำระเงินตอนรับสินค้า")}</p>
        </div>
      )}
    </div>
  );
}
