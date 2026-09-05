"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { cancelOrderNew } from "@/lib/actions/order-transitions";

interface Props {
  orderId:         string;
  itemTitle:       string;
  amount:          number;
  role:            "buyer" | "seller";
  paymentMethod?:  string | null;   // "ESCROW" | "COD" | null (legacy = ESCROW)
  meetupDateTime?: string | null;   // ISO — used to compute grace period hint
  onClose:         () => void;
  onSuccess:       () => void;
}

const BUYER_REASONS = [
  "เปลี่ยนใจ / ไม่ต้องการแล้ว",
  "พบสินค้าอื่นที่ดีกว่า",
  "สั่งซื้อผิดรายการ",
  "ติดต่อผู้ขายไม่ได้",
  "อื่นๆ",
] as const;

const SELLER_REASONS_GENERAL = [
  "สินค้าหมดแล้ว / ขายไปแล้ว",
  "สินค้าชำรุดก่อนจัดส่ง",
  "ราคาในประกาศไม่ถูกต้อง",
  "ไม่สามารถจัดส่งไปยังพื้นที่นั้นได้",
  "ติดต่อผู้ซื้อไม่ได้",
  "อื่นๆ",
] as const;

const SELLER_REASONS_MEETUP = [
  "ผู้ซื้อไม่มาตามนัด",
  "ผู้ซื้อติดต่อไม่ได้",
  "สินค้าชำรุดก่อนส่งมอบ",
  "ไม่สะดวกนัดรับตามเวลาที่กำหนด",
  "อื่นๆ",
] as const;

export default function CancelOrderModal({
  orderId, itemTitle, amount, role, paymentMethod, meetupDateTime, onClose, onSuccess,
}: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const isMeetupOrder = !!meetupDateTime;
  const reasons = role === "buyer"
    ? BUYER_REASONS
    : isMeetupOrder
    ? SELLER_REASONS_MEETUP
    : SELLER_REASONS_GENERAL;

  const [selected,  setSelected]  = useState("");
  const [custom,    setCustom]    = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEscrow  = paymentMethod === "ESCROW" || paymentMethod == null;
  const finalReason = selected === "อื่นๆ" ? custom.trim() : selected;

  // Compute hint for how long until seller CAN cancel (30-min grace period)
  const sellerGraceHint = (() => {
    if (role !== "seller" || !isMeetupOrder || !meetupDateTime) return null;
    const cutoff = new Date(new Date(meetupDateTime).getTime() + 30 * 60 * 1000);
    if (new Date() < cutoff) {
      return cutoff.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    }
    return null; // past cutoff, cancel is unlocked
  })();

  function handleSubmit(e: React.FormEvent) {
  const tr = useLocaleStore((s) => s.tr);
    e.preventDefault();
    setFormError(null);

    if (!selected)                               { setFormError(tr("กรุณาเลือกเหตุผล")); return; }
    if (selected === "อื่นๆ" && !custom.trim()) { setFormError("กรุณาระบุเหตุผล"); return; }

    startTransition(async () => {
      const res = await cancelOrderNew(
        orderId,
        role === "buyer" ? "BUYER" : "SELLER",
        finalReason
      );
      if ("error" in res && res.error) {
        setFormError(res.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-[var(--c-surface)] border-b border-[var(--c-line)] px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-[var(--c-ink)]">{tr("ยกเลิกคำสั่งซื้อ")}</h3>
            <p className="text-xs text-[var(--c-muted)] mt-0.5 truncate max-w-xs">{itemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--c-muted)] hover:bg-[var(--c-line-soft)] hover:text-[var(--c-ink)] transition flex-shrink-0 ml-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Meetup no-show grace-period notice (seller only) */}
          {role === "seller" && isMeetupOrder && sellerGraceHint && (
            <div className="flex items-start gap-3 bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg leading-none mt-0.5">⏳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">{tr("ยังไม่ถึงเวลายกเลิก")}</p>
                <p className="text-xs text-[var(--c-warn)] mt-0.5 leading-relaxed">{tr("กรุณารอจนถึง")}<span className="font-bold">{tr("{0} น.", [sellerGraceHint])}</span>{tr("(30 นาทีหลังเวลานัดรับ) เพื่อให้ผู้ซื้อมีเวลาเดินทาง")}</p>
              </div>
            </div>
          )}

          {/* Refund / no-refund notice */}
          {isEscrow ? (
            <div className="flex items-center gap-3 bg-[var(--c-ok-soft)] border border-[var(--c-ok-line)] rounded-xl px-4 py-3">
              <span className="text-[var(--c-ok)] text-lg">💰</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">{tr("คืนเงินอัตโนมัติ")}</p>
                <p className="text-xs text-[var(--c-ok)]">{tr("฿{0} จะคืนเข้ากระเป๋าผู้ซื้อทันที", [amount.toLocaleString()])}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-[var(--c-canvas)] border border-[var(--c-line)] rounded-xl px-4 py-3">
              <span className="text-[var(--c-muted)] text-lg">💵</span>
              <p className="text-xs text-[var(--c-ink-3)]">{tr("คำสั่งซื้อ COD — ไม่มีการโอนเงินผ่านระบบ")}</p>
            </div>
          )}

          {/* Reason selector */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-ink-1)] mb-2">{tr("เหตุผล")}<span className="text-[var(--c-danger)]">*</span>
            </label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                    selected === r
                      ? "border-red-400 bg-[var(--c-danger-soft)]"
                      : "border-[var(--c-line)] hover:border-[var(--c-danger-line)] hover:bg-[var(--c-danger-soft)]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={selected === r}
                    onChange={() => { setSelected(r); setFormError(null); }}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-[var(--c-ink-1)]">{r}</span>
                </label>
              ))}
            </div>

            {selected === "อื่นๆ" && (
              <textarea
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setFormError(null); }}
                rows={3}
                placeholder={tr("โปรดระบุเหตุผล…")}
                className="mt-3 w-full border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition resize-none"
              />
            )}
          </div>

          {/* Warning note */}
          <div className="bg-[var(--c-canvas)] rounded-xl px-4 py-3 text-xs text-[var(--c-ink-3)] leading-relaxed">
            <span className="font-semibold text-[var(--c-ink-2)]">{tr("หมายเหตุ:")}</span>{" "}
            {role === "buyer"
              ? tr("การยกเลิกจะคืนเงินเข้ากระเป๋าของคุณทันที และสินค้าจะกลับไปแสดงในตลาดใหม่")
              : tr("การยกเลิกจะคืนเงินให้ผู้ซื้อทันที และสินค้าจะกลับไปแสดงในตลาดให้ผู้อื่นซื้อได้")}
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-start gap-2 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-3">
              <span className="text-[var(--c-danger)] flex-shrink-0">⚠️</span>
              <p className="text-sm text-[var(--c-danger)] font-medium">{formError}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
            >{tr("ไม่ยกเลิก")}</button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isPending ? "กำลังดำเนินการ…" : tr("ยืนยันยกเลิก")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
