"use client";

import { useState, useTransition } from "react";
import { submitOrderReview } from "@/lib/actions/escrow-actions";

interface Props {
  orderId:    string;
  itemTitle:  string;
  sellerName: string;
  onClose:    () => void;   // "Skip" — dismisses without submitting
  onSuccess:  () => void;   // called after successful submission
}

export default function ReviewModal({ orderId, itemTitle, sellerName, onClose, onSuccess }: Props) {
  const [rating,    setRating]    = useState(0);
  const [hovered,   setHovered]   = useState(0);
  const [comment,   setComment]   = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayRating = hovered || rating;

  const STAR_LABELS = ["", "แย่มาก", "พอใช้", "ปานกลาง", "ดี", "ยอดเยี่ยม"];

  function handleSubmit() {
    if (rating === 0) { setError("กรุณาเลือกคะแนนดาวก่อน"); return; }
    setError(null);
    startTransition(async () => {
      const res = await submitOrderReview(orderId, rating, comment || undefined);
      if (res.error) {
        setError(res.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-5 text-center">
          <p className="text-3xl mb-1">⭐</p>
          <h3 className="text-base font-extrabold text-white">ให้คะแนนสินค้าและผู้ขาย</h3>
          <p className="text-amber-100 text-xs mt-0.5 truncate">"{itemTitle}"</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Seller name */}
          <p className="text-center text-sm text-[#555]">
            ผู้ขาย: <span className="font-semibold text-[#111]">{sellerName}</span>
          </p>

          {/* Star rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => { setRating(star); setError(null); }}
                  className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                  style={{ color: star <= displayRating ? "#f59e0b" : "#e5e7eb" }}
                  aria-label={`${star} ดาว`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className={`text-sm font-semibold h-5 transition-colors ${
              displayRating ? "text-amber-600" : "text-[#ccc]"
            }`}>
              {displayRating ? STAR_LABELS[displayRating] : "เลือกคะแนน"}
            </p>
          </div>

          {/* Comment textarea */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-1.5">
              ความคิดเห็น
              <span className="ml-1.5 text-xs font-normal text-[#9a9590]">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="บอกเล่าประสบการณ์การซื้อขายของคุณ…"
              disabled={isPending}
              className="w-full border border-[#e5e3de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition resize-none disabled:opacity-60"
            />
            <p className="text-[10px] text-[#bbb] text-right mt-0.5">{comment.length}/500</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 text-sm">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-50"
            >
              ข้าม
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || rating === 0}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isPending ? "กำลังส่ง…" : "ส่งรีวิว ⭐"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
