"use client";

import type { RentalCheckoutState, RentalPricing } from "./useRentalCheckoutReducer";

interface Props {
  state: RentalCheckoutState;
  pricing: RentalPricing;
  walletBalance: number | null;
  onSetPayment: (method: "ESCROW" | "COD") => void;
}

export default function PaymentStep({ state, pricing, walletBalance, onSetPayment }: Props) {
  const balance = walletBalance ?? 0;
  const { totalPaid, securityDeposit, rentalFee, platformFee } = pricing;

  // For COD: only the deposit needs to come from wallet
  const codRequiredFromWallet = securityDeposit;
  const escrowRequired        = totalPaid;

  const canAffordEscrow = balance >= escrowRequired;
  const canAffordCOD    = balance >= codRequiredFromWallet;

  const afterEscrow = balance - escrowRequired;
  const afterCOD    = balance - codRequiredFromWallet;

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--c-ink-3)]">
        เลือกวิธีชำระเงิน — มัดจำจะถูกกักใน Escrow เสมอ ไม่ว่าจะเลือกวิธีใด
      </p>

      {/* ESCROW option */}
      <button
        type="button"
        onClick={() => onSetPayment("ESCROW")}
        disabled={!canAffordEscrow}
        className={`w-full p-4 rounded-xl border-2 text-left transition ${
          state.paymentMethod === "ESCROW"
            ? "border-[var(--c-accent)] bg-[var(--c-accent)]/5"
            : "border-[var(--c-line)] hover:border-[var(--c-accent)]/50"
        } ${!canAffordEscrow ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-[var(--c-ink)]">💳 Escrow — ปลอดภัยที่สุด</span>
          {state.paymentMethod === "ESCROW" && (
            <span className="text-xs text-[var(--c-accent)] font-bold">✓ เลือกอยู่</span>
          )}
        </div>
        <p className="text-xs text-[var(--c-ink-3)]">ชำระผ่านระบบกักเงิน — เงินจะถูกโอนให้เจ้าของเมื่อคืนของสำเร็จ</p>
        <p className="text-xs text-[var(--c-ok)] font-semibold mt-1">🏆 แนะนำสำหรับการเช่า</p>
        {!canAffordEscrow && (
          <p className="text-xs text-[var(--c-danger)] mt-1">ยอดเงินไม่พอ (ต้องการ ฿{escrowRequired.toLocaleString()})</p>
        )}
      </button>

      {/* COD option */}
      <button
        type="button"
        onClick={() => onSetPayment("COD")}
        disabled={!canAffordCOD}
        className={`w-full p-4 rounded-xl border-2 text-left transition ${
          state.paymentMethod === "COD"
            ? "border-amber-400 bg-[var(--c-warn-soft)]"
            : "border-[var(--c-line)] hover:border-amber-300"
        } ${!canAffordCOD ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-[var(--c-ink)]">💵 จ่ายเงินสด (COD)</span>
          {state.paymentMethod === "COD" && (
            <span className="text-xs text-[var(--c-warn)] font-bold">✓ เลือกอยู่</span>
          )}
        </div>
        <p className="text-xs text-[var(--c-ink-3)]">จ่ายค่าเช่าสดตอนรับของ — มัดจำยังต้องผ่านระบบเสมอ</p>
        <p className="text-xs text-[var(--c-warn)] mt-1">⚠️ ไม่มีการคุ้มครองค่าเช่า</p>
        {!canAffordCOD && (
          <p className="text-xs text-[var(--c-danger)] mt-1">ยอดเงินมัดจำไม่พอ (ต้องการ ฿{codRequiredFromWallet.toLocaleString()})</p>
        )}
      </button>

      {/* COD important note */}
      {state.paymentMethod === "COD" && (
        <div className="bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl p-3 text-xs text-[var(--c-warn)]">
          <p className="font-semibold mb-1">⚠️ หมายเหตุสำคัญ</p>
          <p>สำหรับการเช่า เงินมัดจำจะถูกกักไว้ในระบบ Escrow เสมอ ไม่ว่าจะเลือกจ่ายค่าเช่าด้วยวิธีใดก็ตาม</p>
        </div>
      )}

      {/* Wallet summary */}
      <div className="bg-[var(--c-subtle)] rounded-xl p-4 space-y-2 text-sm border border-[var(--c-line-soft)]">
        <p className="text-xs font-bold text-[var(--c-ink-2)] uppercase tracking-wide">ยอดเงินในกระเป๋า</p>
        <div className="flex justify-between">
          <span className="text-[var(--c-ink-3)]">ยอดปัจจุบัน</span>
          <span className="font-bold text-[var(--c-ink)]">฿{balance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--c-ink-3)]">หักออก (จากกระเป๋า)</span>
          <span className="font-medium text-[var(--c-danger)]">
            −฿{(state.paymentMethod === "COD" ? codRequiredFromWallet : escrowRequired).toLocaleString()}
          </span>
        </div>
        <div className="border-t border-[var(--c-line)] pt-2 flex justify-between">
          <span className="text-[var(--c-ink-2)]">คงเหลือ</span>
          <span className={`font-bold ${
            (state.paymentMethod === "COD" ? afterCOD : afterEscrow) < 0
              ? "text-[var(--c-danger)]" : "text-[var(--c-ok)]"
          }`}>
            ฿{(state.paymentMethod === "COD" ? afterCOD : afterEscrow).toLocaleString()}
          </span>
        </div>
        {state.paymentMethod === "COD" && (
          <>
            <div className="flex justify-between text-xs text-[var(--c-faint)]">
              <span>มัดจำ (กักใน escrow)</span>
              <span>฿{securityDeposit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--c-warn)]">
              <span>ค่าเช่า + ค่าธรรมเนียม (จ่ายสด)</span>
              <span>฿{(rentalFee + platformFee).toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
