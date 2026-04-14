"use client";

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
  const deliveryMethod = state.deliveryMethod ?? "SHIPPING";
  const paymentMethod = state.paymentMethod ?? "ESCROW";

  const breakdown = getPriceBreakdown(itemPrice, deliveryMethod, paymentMethod);
  const sufficient = walletBalance !== null && walletBalance >= breakdown.totalAmount;
  const deficit = walletBalance !== null ? breakdown.totalAmount - walletBalance : 0;

  return (
    <div className="fade-up space-y-4">
      <h3 className="text-base font-bold text-[#111]">เลือกวิธีชำระเงิน</h3>

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
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                🏆 แนะนำ
              </span>
            )}
          </div>
          <p className="text-sm font-bold mt-1">จ่ายผ่าน Escrow</p>
          <p className="text-[11px] text-emerald-600 font-semibold">✅ ปลอดภัยที่สุด</p>
          <p className="text-[10px] text-[#9a9590] mt-0.5 leading-tight">
            เงินจะถูกกักไว้จนกว่าคุณจะยืนยันว่าได้รับของ
          </p>
        </button>

        {/* COD */}
        {allowCOD && (
          <button
            onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", payload: "COD" })}
            className={`checkout-card-radio text-left ${paymentMethod === "COD" ? "selected" : ""}`}
          >
            <span className="text-2xl">💵</span>
            <p className="text-sm font-bold mt-1">จ่ายเงินสด</p>
            <p className="text-[11px] text-amber-600 font-semibold">⚠️ ไม่มีการคุ้มครอง</p>
            <p className="text-[10px] text-[#9a9590] mt-0.5 leading-tight">
              จ่ายตอนรับของ ({deliveryMethod === "SHIPPING" ? "เก็บเงินปลายทาง" : "จ่ายตอนนัดรับ"})
            </p>
          </button>
        )}
      </div>

      {/* Escrow details */}
      {paymentMethod === "ESCROW" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span>💳</span>
            <span className="font-bold text-blue-800">รายละเอียดการชำระเงิน</span>
          </div>

          {/* Wallet balance */}
          <div className="flex justify-between text-sm">
            <span className="text-[#555]">ยอดเงินในกระเป๋า</span>
            {loadingBalance ? (
              <span className="text-[#9a9590] animate-pulse">กำลังโหลด…</span>
            ) : (
              <span className={`font-bold ${sufficient ? "text-emerald-600" : "text-red-600"}`}>
                ฿{walletBalance?.toLocaleString()}
              </span>
            )}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-blue-100 pt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#555]">ราคาสินค้า</span>
              <span>฿{breakdown.itemPrice.toLocaleString()}</span>
            </div>
            {breakdown.shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-[#555]">ค่าจัดส่ง</span>
                <span>฿{breakdown.shippingCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#555]">ค่าธรรมเนียม (5%)</span>
              <span>฿{breakdown.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-[#111] border-t border-blue-100 pt-1.5">
              <span>รวมทั้งสิ้น</span>
              <span>฿{breakdown.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Balance status */}
          {!loadingBalance && walletBalance !== null && (
            sufficient ? (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <span>✅</span>
                <span>ยอดเงินเพียงพอ — คงเหลือหลังชำระ ฿{(walletBalance - breakdown.totalAmount).toLocaleString()}</span>
              </div>
            ) : (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
                <p className="text-xs text-red-700 font-semibold">⚠️ ยอดเงินไม่เพียงพอ</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-[#555]">ยอดที่ต้องชำระ:</span>
                  <span className="text-right font-bold">฿{breakdown.totalAmount.toLocaleString()}</span>
                  <span className="text-[#555]">ขาดอีก:</span>
                  <span className="text-right font-bold text-red-600">฿{deficit.toLocaleString()}</span>
                </div>
                {allowCOD && (
                  <button
                    onClick={() => dispatch({ type: "SET_PAYMENT_METHOD", payload: "COD" })}
                    className="w-full mt-1 py-2 rounded-lg bg-white border border-[#e5e3de] text-xs font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
                  >
                    💵 เปลี่ยนเป็นจ่ายเงินสด
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* COD details */}
      {paymentMethod === "COD" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span>⚠️</span>
            <span className="font-bold text-amber-800">คำเตือน: การจ่ายเงินสด</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            การจ่ายเงินสดจะ <strong>ไม่ได้รับการคุ้มครอง</strong> จากระบบ Escrow
            หากเกิดปัญหา แพลตฟอร์มอาจไม่สามารถช่วยเหลือเรื่องการเงินได้
          </p>
          <p className="text-xs text-blue-600">
            💡 เราแนะนำให้ใช้ระบบ Escrow เพื่อความปลอดภัย
          </p>

          {/* Risk checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.codRiskAccepted}
              onChange={() => dispatch({ type: "TOGGLE_COD_RISK" })}
              className="mt-0.5 rounded"
            />
            <span className="text-xs text-[#555]">
              ฉันเข้าใจและยอมรับความเสี่ยง <span className="text-red-500">*</span>
            </span>
          </label>

          {/* Price breakdown */}
          <div className="border-t border-amber-100 pt-2 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#555]">ราคาสินค้า</span>
              <span>฿{breakdown.itemPrice.toLocaleString()}</span>
            </div>
            {breakdown.shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-[#555]">ค่าจัดส่ง</span>
                <span>฿{breakdown.shippingCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#555]">ค่าธรรมเนียม</span>
              <span className="text-emerald-600 font-semibold">฿0 (ฟรีสำหรับ COD)</span>
            </div>
            <div className="flex justify-between font-bold text-[#111] border-t border-amber-100 pt-1.5">
              <span>รวมทั้งสิ้น</span>
              <span>฿{breakdown.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-[#9a9590]">💵 ชำระเงินตอนรับสินค้า</p>
        </div>
      )}
    </div>
  );
}
