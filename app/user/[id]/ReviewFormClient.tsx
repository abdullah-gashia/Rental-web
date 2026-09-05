"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState } from "react";
import { submitDirectReview } from "@/lib/actions/trust-actions";

interface ReviewFormClientProps {
  revieweeId: string;
  sellerName: string;
  onSuccess: () => void;
}

const STAR_LABELS = ["", "แย่มาก", "แย่", "พอใช้", "ดี", "ดีมาก"];

export default function ReviewFormClient({
  revieweeId,
  sellerName,
  onSuccess,
}: ReviewFormClientProps) {
  const tr = useLocaleStore((s) => s.tr);
  const [hovered,  setHovered]  = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment,  setComment]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const display = hovered || selected;

  async function handleSubmit(e: { preventDefault(): void }) {
  const tr = useLocaleStore((s) => s.tr);
    e.preventDefault();
    if (selected === 0) { setError(tr("กรุณาเลือกคะแนนก่อน")); return; }
    setError("");
    setLoading(true);
    const result = await submitDirectReview(revieweeId, selected, comment);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm font-bold text-[var(--c-ink)]">ให้คะแนน {sellerName}</p>
        <p className="text-xs text-[var(--c-muted)] mt-0.5">{tr("รีวิวของคุณจะช่วยให้ชุมชนปลอดภัยขึ้น")}</p>
      </div>

      {/* Star picker */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onClick={() => setSelected(star)}
              className="text-[42px] leading-none transition-transform duration-100 hover:scale-110 focus:outline-none"
              aria-label={tr("{0} ดาว", [star])}
            >
              <span className={star <= display ? "text-amber-400" : "text-[#e0ddd8]"}>★</span>
            </button>
          ))}
        </div>
        <p className={`text-sm font-semibold h-5 text-[var(--c-ink-2)] transition-opacity ${display ? "opacity-100" : "opacity-0"}`}>
          {tr(STAR_LABELS[display])}
        </p>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1.5">{tr("ความคิดเห็น")}<span className="font-normal text-[var(--c-muted)]">{tr("(ไม่บังคับ)")}</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={tr("แชร์ประสบการณ์ของคุณกับผู้ขายคนนี้...")}
          className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--c-ink)] transition"
        />
        <p className="text-[11px] text-[var(--c-faint)] text-right mt-0.5">{comment.length}/500</p>
      </div>

      {error && (
        <p className="text-sm text-[var(--c-danger)] bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || selected === 0}
        className="w-full bg-[var(--c-accent)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--c-accent-str)] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>{tr("กำลังส่ง...")}</>
        ) : tr("ส่งรีวิว")}
      </button>
    </form>
  );
}
