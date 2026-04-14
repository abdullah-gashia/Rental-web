"use client";

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
    e.preventDefault();
    setFormError(null);

    if (!selected)                               { setFormError("กรุณาเลือกเหตุผล"); return; }
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

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e5e3de] px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-[#111]">ยกเลิกคำสั่งซื้อ</h3>
            <p className="text-xs text-[#9a9590] mt-0.5 truncate max-w-xs">{itemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9590] hover:bg-[#f0ede7] hover:text-[#111] transition flex-shrink-0 ml-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Meetup no-show grace-period notice (seller only) */}
          {role === "seller" && isMeetupOrder && sellerGraceHint && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg leading-none mt-0.5">⏳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">ยังไม่ถึงเวลายกเลิก</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  กรุณารอจนถึง <span className="font-bold">{sellerGraceHint} น.</span> (30 นาทีหลังเวลานัดรับ)
                  เพื่อให้ผู้ซื้อมีเวลาเดินทาง
                </p>
              </div>
            </div>
          )}

          {/* Refund / no-refund notice */}
          {isEscrow ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="text-emerald-600 text-lg">💰</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">คืนเงินอัตโนมัติ</p>
                <p className="text-xs text-emerald-600">฿{amount.toLocaleString()} จะคืนเข้ากระเป๋าผู้ซื้อทันที</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-[#f7f6f3] border border-[#e5e3de] rounded-xl px-4 py-3">
              <span className="text-[#9a9590] text-lg">💵</span>
              <p className="text-xs text-[#777]">คำสั่งซื้อ COD — ไม่มีการโอนเงินผ่านระบบ</p>
            </div>
          )}

          {/* Reason selector */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-2">
              เหตุผล <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                    selected === r
                      ? "border-red-400 bg-red-50"
                      : "border-[#e5e3de] hover:border-red-200 hover:bg-red-50/30"
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
                  <span className="text-sm text-[#333]">{r}</span>
                </label>
              ))}
            </div>

            {selected === "อื่นๆ" && (
              <textarea
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setFormError(null); }}
                rows={3}
                placeholder="โปรดระบุเหตุผล…"
                className="mt-3 w-full border border-[#e5e3de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition resize-none"
              />
            )}
          </div>

          {/* Warning note */}
          <div className="bg-[#f7f6f3] rounded-xl px-4 py-3 text-xs text-[#777] leading-relaxed">
            <span className="font-semibold text-[#555]">หมายเหตุ:</span>{" "}
            {role === "buyer"
              ? "การยกเลิกจะคืนเงินเข้ากระเป๋าของคุณทันที และสินค้าจะกลับไปแสดงในตลาดใหม่"
              : "การยกเลิกจะคืนเงินให้ผู้ซื้อทันที และสินค้าจะกลับไปแสดงในตลาดให้ผู้อื่นซื้อได้"}
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{formError}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-50"
            >
              ไม่ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isPending ? "กำลังดำเนินการ…" : "ยืนยันยกเลิก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
