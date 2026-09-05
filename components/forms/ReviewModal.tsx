"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { submitOrderReview } from "@/lib/actions/escrow-actions";

interface Props {
  orderId:   string;
  itemTitle: string;
  /** Who is being rated — the modal reads from the reviewer's point of view */
  counterpartyRole: "seller" | "buyer";
  counterpartyName: string;
  onClose:   () => void;   // "Skip" — dismisses without submitting
  onSuccess: () => void;   // called after successful submission
}

export default function ReviewModal({
  orderId,
  itemTitle,
  counterpartyRole,
  counterpartyName,
  onClose,
  onSuccess,
}: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const roleLabel = counterpartyRole === "seller" ? "ผู้ขาย" : "ผู้ซื้อ";
  const [rating,    setRating]    = useState(0);
  const [hovered,   setHovered]   = useState(0);
  const [comment,   setComment]   = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayRating = hovered || rating;

  const STAR_LABELS = ["", "แย่มาก", "พอใช้", tr("ปานกลาง"), "ดี", tr("ยอดเยี่ยม")];

  function handleSubmit() {
  const tr = useLocaleStore((s) => s.tr);
    if (rating === 0) { setError(tr("กรุณาเลือกคะแนนดาวก่อน")); return; }
    setError(null);
    startTransition(async () => {
      const res = await submitOrderReview(orderId, rating, comment || undefined);
      if (res.error) {
        setError(tr(res.error));
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-5 text-center">
          <p className="text-3xl mb-1">⭐</p>
          <h3 className="text-base font-extrabold text-white">
            {counterpartyRole === "seller" ? tr("ให้คะแนนสินค้าและผู้ขาย") : "ให้คะแนนผู้ซื้อ"}
          </h3>
          <p className="text-amber-100 text-xs mt-0.5 truncate">"{itemTitle}"</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Seller name */}
          <p className="text-center text-sm text-[var(--c-ink-2)]">
            {roleLabel}: <span className="font-semibold text-[var(--c-ink)]">{counterpartyName}</span>
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
                  aria-label={tr("{0} ดาว", [star])}
                >
                  ★
                </button>
              ))}
            </div>
            <p className={`text-sm font-semibold h-5 transition-colors ${
              displayRating ? "text-[var(--c-warn)]" : "text-[var(--c-line-str)]"
            }`}>
              {displayRating ? tr(STAR_LABELS[displayRating]) : tr("เลือกคะแนน")}
            </p>
          </div>

          {/* Comment textarea */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-ink-1)] mb-1.5">{tr("ความคิดเห็น")}<span className="ml-1.5 text-xs font-normal text-[var(--c-muted)]">{tr("(ไม่บังคับ)")}</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={tr("บอกเล่าประสบการณ์การซื้อขายของคุณ…")}
              disabled={isPending}
              className="w-full border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition resize-none disabled:opacity-60"
            />
            <p className="text-[10px] text-[var(--c-faint-2)] text-right mt-0.5">{comment.length}/500</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-3">
              <span className="text-[var(--c-danger)] text-sm">⚠️</span>
              <p className="text-sm text-[var(--c-danger)] font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
            >{tr("ข้าม")}</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || rating === 0}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isPending ? "กำลังส่ง…" : tr("ส่งรีวิว ⭐")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
