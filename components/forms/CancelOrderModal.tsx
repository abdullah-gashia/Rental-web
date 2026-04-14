"use client";

import { useState, useTransition } from "react";
import { cancelOrder } from "@/lib/actions/escrow-actions";

interface Props {
  orderId:   string;
  itemTitle: string;
  amount:    number;
  role:      "buyer" | "seller";
  onClose:   () => void;
  onSuccess: () => void;
}

const BUYER_REASONS = [
  "เปลี่ยนใจ / ไม่ต้องการแล้ว",
  "พบสินค้าอื่นที่ดีกว่า",
  "สั่งซื้อผิดรายการ",
  "ติดต่อผู้ขายไม่ได้",
  "อื่นๆ",
] as const;

const SELLER_REASONS = [
  "สินค้าหมดแล้ว / ขายไปแล้ว",
  "สินค้าชำรุดก่อนจัดส่ง",
  "ราคาในประกาศไม่ถูกต้อง",
  "ไม่สามารถจัดส่งไปยังพื้นที่นั้นได้",
  "ติดต่อผู้ซื้อไม่ได้",
  "อื่นๆ",
] as const;

export default function CancelOrderModal({
  orderId, itemTitle, amount, role, onClose, onSuccess,
}: Props) {
  const reasons = role === "buyer" ? BUYER_REASONS : SELLER_REASONS;
  const [selected,  setSelected]  = useState("");
  const [custom,    setCustom]    = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const finalReason = selected === "อื่นๆ" ? custom.trim() : selected;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selected)                          { setFormError("กรุณาเลือกเหตุผล"); return; }
    if (selected === "อื่นๆ" && !custom.trim()) { setFormError("กรุณาระบุเหตุผล"); return; }

    startTransition(async () => {
      const res = await cancelOrder(orderId, finalReason);
      if (res.error) {
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

          {/* Refund notice */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-lg">💰</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">คืนเงินอัตโนมัติ</p>
                <p className="text-xs text-emerald-600">฿{amount.toLocaleString()} จะคืนเข้ากระเป๋าผู้ซื้อทันที</p>
              </div>
            </div>
          </div>

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

            {/* Custom reason textarea */}
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

          {/* Warning */}
          <div className="bg-[#f7f6f3] rounded-xl px-4 py-3 text-xs text-[#777] leading-relaxed">
            <span className="font-semibold text-[#555]">หมายเหตุ:</span>{" "}
            การยกเลิกจะ
            {role === "buyer"
              ? "คืนเงินเข้ากระเป๋าของคุณทันที และสินค้าจะกลับไปแสดงในตลาดใหม่"
              : "คืนเงินให้ผู้ซื้อทันที และสินค้าจะกลับไปแสดงในตลาดให้ผู้อื่นซื้อได้"}
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500">⚠️</span>
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
