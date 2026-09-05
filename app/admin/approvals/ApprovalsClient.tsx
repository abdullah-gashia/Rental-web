"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveItem, rejectItem } from "@/lib/actions/moderation-actions";
import { useToastStore } from "@/lib/stores/toast-store";

interface PendingItem {
  id: string;
  title: string;
  description: string;
  price: number;
  listingType: "SELL" | "RENT";
  condition: string;
  createdAt: string;
  safetyScore: number | null;
  moderationReason: string | null;
  emoji: string | null;
  color: string | null;
  seller: { id: string; name: string | null; email: string; image: string | null };
  category: { nameTh: string; nameEn: string; emoji: string | null };
  images: { id: string; url: string; isMain: boolean }[];
}

const CONDITION_LABELS: Record<string, string> = {
  LIKE_NEW:     "เหมือนใหม่",
  GOOD:         "ดี",
  FAIR:         "พอใช้",
  NEEDS_REPAIR: "ต้องซ่อม",
};

// ─── Safety score badge ──────────────────────────────

/** Colour tracks the band the score falls in, not the raw number. */
function SafetyBadge({ score }: { score: number }) {
  const tone =
    score >= 95 ? { bg: "var(--c-ok-soft)", fg: "var(--c-ok)", br: "var(--c-ok-line)" } :
    score >= 50 ? { bg: "#fff7e6", fg: "var(--c-warn)", br: "#f5e3b8" } :
                  { bg: "#fdecec", fg: "var(--c-danger)", br: "#f5c7c4" };

  return (
    <span
      title="คะแนนความปลอดภัยจากการตรวจข้อความอัตโนมัติ"
      className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold font-mono"
      style={{ background: tone.bg, color: tone.fg, borderColor: tone.br }}
    >
      {score}%
    </span>
  );
}

// ─── Reject Modal ────────────────────────────────────

function RejectModal({
  item,
  onClose,
  onSubmit,
  isPending,
}: {
  item: PendingItem;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isPending: boolean;
}) {
  const tr = useLocaleStore((s) => s.tr);
  const [reason, setReason] = useState("");
  const [error, setError]   = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("กรุณาระบุเหตุผล"); return; }
    onSubmit(reason);
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 fade-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--c-ink)]">{tr("ปฏิเสธสินค้า")}</h3>
            <p className="text-sm text-[var(--c-ink-3)] mt-0.5 truncate max-w-xs">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[var(--c-line-soft)] flex items-center justify-center transition text-[#666]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Item preview */}
        <div className="bg-[var(--c-canvas)] rounded-xl p-3 mb-5 flex gap-3 items-center">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--c-surface)] flex items-center justify-center flex-shrink-0 border border-[var(--c-line)]">
            {item.images[0]?.url ? (
              <img src={item.images[0].url} alt={item.title} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl">{item.emoji ?? item.category.emoji ?? "📦"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--c-ink)] truncate">{item.title}</p>
            <p className="text-xs text-[var(--c-ink-3)]">ผู้ขาย: {item.seller.name ?? item.seller.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1.5">{tr("เหตุผลในการปฏิเสธ")}<span className="text-[var(--c-danger)]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              rows={4}
              className="w-full border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition resize-none"
              placeholder="เช่น: รูปภาพไม่ชัด, ราคาไม่เหมาะสม, สินค้าต้องห้าม..."
            />
            {error && <p className="text-xs text-[var(--c-danger)] mt-1.5">{error}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-medium text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>{tr("กำลังส่ง...")}</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>{tr("ยืนยันปฏิเสธ")}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────

export default function ApprovalsClient({ items: initialItems }: { items: PendingItem[] }) {
  const tr = useLocaleStore((s) => s.tr);
  const [items, setItems]             = useState<PendingItem[]>(initialItems);
  const [rejectTarget, setRejectTarget] = useState<PendingItem | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const showToast = useToastStore((s) => s.show);
  const router = useRouter();

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleApprove(item: PendingItem) {
    setProcessingId(item.id);
    startTransition(async () => {
      const result = await approveItem(item.id);
      if (result.error) {
        showToast(tr("เกิดข้อผิดพลาด: {0}", [result.error]));
      } else {
        removeItem(item.id);
        showToast(tr("✅ อนุมัติ \"{0}\" เรียบร้อยแล้ว", [item.title]));
      }
      setProcessingId(null);
    });
  }

  function handleRejectSubmit(reason: string) {
    if (!rejectTarget) return;
    const target = rejectTarget;
    startTransition(async () => {
      const result = await rejectItem(target.id, reason);
      if (result.error) {
        showToast(tr("เกิดข้อผิดพลาด: {0}", [result.error]));
      } else {
        removeItem(target.id);
        showToast(tr("สินค้า \"{0}\" ถูกปฏิเสธแล้ว", [target.title]));
        setRejectTarget(null);
      }
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--c-ink)]">{tr("ตรวจสอบสินค้า")}</h1>
            <p className="text-sm text-[var(--c-ink-3)] mt-1">{tr("สินค้าที่รอการอนุมัติจากผู้ขาย")}</p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] px-4 py-2 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold text-[var(--c-warn)]">{items.length} รายการรอตรวจสอบ</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-16 text-center">
          <div className="w-16 h-16 bg-[var(--c-ok-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--c-ok)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--c-ink)] mb-2">{tr("ไม่มีสินค้าที่รอตรวจสอบ")}</h3>
          <p className="text-sm text-[var(--c-ink-3)]">{tr("สินค้าทั้งหมดได้รับการตรวจสอบแล้ว 🎉")}</p>
        </div>
      )}

      {/* Items List */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => {
            const imgUrl = item.images.find((i) => i.isMain)?.url ?? item.images[0]?.url ?? null;
            const isProcessing = processingId === item.id && isPending;

            return (
              <div
                key={item.id}
                className={`bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] overflow-hidden transition ${isProcessing ? "opacity-60 pointer-events-none" : "hover:shadow-sm"}`}
              >
                <div className="p-5">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-[var(--c-line-soft)] flex items-center justify-center border border-[var(--c-line)]">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.title} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-4xl">{item.emoji ?? item.category.emoji ?? "📦"}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="inline-flex items-center gap-1 bg-[var(--c-line-soft)] text-[var(--c-ink-3)] text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1">
                            {item.category.emoji} {item.category.nameTh}
                          </span>
                          <h3 className="text-base font-bold text-[var(--c-ink)]">{item.title}</h3>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-lg font-bold text-[var(--c-accent)]">
                            ฿{item.price.toLocaleString()}
                            {item.listingType === "RENT" && <span className="text-xs font-normal text-[var(--c-ink-3)]">{tr("/เดือน")}</span>}
                          </p>
                          <p className="text-xs text-[var(--c-faint)]">{tr(CONDITION_LABELS[item.condition] ?? item.condition)}</p>
                        </div>
                      </div>

                      {/* Automatic screening result */}
                      {item.safetyScore !== null && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-[var(--c-line)] bg-[var(--c-subtle)] px-3 py-2">
                          <SafetyBadge score={item.safetyScore} />
                          <p className="text-[11px] text-[var(--c-ink-3)] leading-relaxed flex-1 min-w-0">
                            {item.moderationReason ?? "—"}
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-sm text-[var(--c-ink-2)] mt-2 line-clamp-2">{item.description}</p>

                      {/* Seller + Date */}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-lite)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {(item.seller.name ?? item.seller.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--c-ink-1)]">{item.seller.name ?? "ไม่ระบุชื่อ"}</p>
                            <p className="text-[10px] text-[var(--c-faint)]">{item.seller.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--c-faint)]">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ส่งเมื่อ {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--c-line-soft)]">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isProcessing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => setRejectTarget(item)}
                      disabled={isProcessing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>{tr("ปฏิเสธ")}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSubmit={handleRejectSubmit}
          isPending={isPending}
        />
      )}
    </>
  );
}
