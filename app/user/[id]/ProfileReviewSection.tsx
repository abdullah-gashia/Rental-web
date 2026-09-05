"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReviewFormClient from "./ReviewFormClient";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; name: string | null; image: string | null };
}

interface ProfileReviewSectionProps {
  reviews: Review[];
  sellerId: string;
  sellerName: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-[var(--c-line)]"}>★</span>
      ))}
    </span>
  );
}

export default function ProfileReviewSection({
  reviews,
  sellerId,
  sellerName,
}: ProfileReviewSectionProps) {
  const tr = useLocaleStore((s) => s.tr);
  const router = useRouter();
  const [formVisible, setFormVisible] = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  function handleSuccess() {
    setSubmitted(true);
    setFormVisible(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">

      {/* ── Leave a Review CTA ─────────────────────────────────────────── */}
      {!submitted ? (
        <div className="bg-[#fff8f0] border border-[#ffd4b3] rounded-2xl p-5">
          {formVisible ? (
            <ReviewFormClient
              revieweeId={sellerId}
              sellerName={sellerName}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--c-ink)]">{tr("มีประสบการณ์กับผู้ขายคนนี้?")}</p>
                <p className="text-xs text-[var(--c-muted)] mt-0.5">{tr("แชร์รีวิวของคุณเพื่อช่วยให้ชุมชนปลอดภัยขึ้น")}</p>
              </div>
              <button
                onClick={() => setFormVisible(true)}
                className="flex-shrink-0 bg-[var(--c-accent)] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[var(--c-accent-str)] transition"
              >{tr("เขียนรีวิว")}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--c-ok-soft)] border border-[var(--c-ok-line)] rounded-2xl px-5 py-4 text-sm font-semibold text-[var(--c-ok)]">{tr("✅ ส่งรีวิวเรียบร้อยแล้ว ขอบคุณที่ช่วยสร้างชุมชนที่ดี!")}</div>
      )}

      {/* ── Reviews List ───────────────────────────────────────────────── */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--c-line)]">
          <h2 className="text-sm font-bold text-[var(--c-ink)]">{tr("รีวิว")}<span className="ml-2 text-[var(--c-muted)] font-normal">({reviews.length})</span>
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--c-muted)]">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">{tr("ยังไม่มีรีวิว")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--c-line-soft)]">
            {reviews.map((review) => (
              <li key={review.id} className="px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--c-line-soft)] flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {review.reviewer.image ? (
                      <img src={review.reviewer.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-[var(--c-muted)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--c-ink)]">
                        {review.reviewer.name ?? tr("ผู้ใช้ไม่ระบุชื่อ")}
                      </span>
                      <Stars rating={review.rating} />
                      <span className="text-[10px] text-[var(--c-faint)] ml-auto">
                        {new Date(review.createdAt).toLocaleDateString("th-TH", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-[var(--c-ink-2)] leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
