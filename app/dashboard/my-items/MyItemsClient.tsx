"use client";

import { useState, useTransition } from "react";
import { deleteItem, cancelDeletion } from "@/lib/actions/item-actions";
import { useToastStore } from "@/lib/stores/toast-store";
import { useRouter } from "next/navigation";
import CountdownTimer from "@/components/ui/CountdownTimer";

// ─── Types ────────────────────────────────────────────

type ItemStatus =
  | "PENDING" | "APPROVED" | "REJECTED" | "UNAVAILABLE"
  | "ACTIVE"  | "SOLD"     | "RENTED"   | "EXPIRED" | "REMOVED";

interface MyItem {
  id: string;
  title: string;
  description: string;
  price: number;
  status: ItemStatus;
  rejectReason: string | null;
  scheduledForDeletionAt: string | null; // ISO string; null = not scheduled
  listingType: "SELL" | "RENT";
  condition: string;
  createdAt: string;
  emoji: string | null;
  color: string | null;
  category: { nameTh: string; nameEn: string; emoji: string | null };
  images: { id: string; url: string; isMain: boolean }[];
}

interface Props {
  items: MyItem[];
  userName: string;
}

// ─── Helpers ──────────────────────────────────────────

const GRACE_MS = 24 * 60 * 60 * 1000; // 24 h in ms

/** ISO string of when the 24-h deletion window closes */
function expiryDate(scheduledAt: string): string {
  return new Date(new Date(scheduledAt).getTime() + GRACE_MS).toISOString();
}

/** True if the 24-h window has already closed */
function isGraceExpired(scheduledAt: string): boolean {
  return Date.now() > new Date(scheduledAt).getTime() + GRACE_MS;
}

// ─── Status badge ─────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:     { label: "รอตรวจสอบ",   bg: "bg-yellow-50",  text: "text-yellow-700", dot: "bg-yellow-400" },
  APPROVED:    { label: "อนุมัติแล้ว", bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  REJECTED:    { label: "ถูกปฏิเสธ",   bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500"    },
  UNAVAILABLE: { label: "ถูกลบ",       bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400"   },
  ACTIVE:      { label: "เผยแพร่",     bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
  SOLD:        { label: "ขายแล้ว",     bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
};

function StatusBadge({ status }: { status: ItemStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Delete confirmation modal ────────────────────────

function DeleteModal({
  item, onClose, onConfirm, isPending,
}: {
  item: MyItem;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 fade-up">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111] text-center mb-2">กำหนดลบสินค้า?</h3>
        <p className="text-sm text-[#555] text-center mb-1 px-2">
          สินค้า <span className="font-semibold">&ldquo;{item.title}&rdquo;</span> จะถูกลบออกหลังจาก
        </p>
        <p className="text-sm font-bold text-orange-600 text-center mb-4">24 ชั่วโมง</p>
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 text-xs text-orange-700 text-center">
          คุณสามารถ <span className="font-semibold">ยกเลิก</span>การลบได้ตลอดระหว่าง 24 ชั่วโมงนี้
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#e5e3de] text-sm font-medium text-[#555] hover:bg-[#f7f6f3] transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังดำเนินการ...
              </>
            ) : "ยืนยันการลบ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────

export default function MyItemsClient({ items, userName }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<MyItem | null>(null);
  const [isPending, startTransition]    = useTransition();
  const showToast = useToastStore((s) => s.show);
  const router    = useRouter();

  // Items to show: exclude hard-deleted; soft-deleted ones stay visible
  const activeItems = items.filter(
    (i) => i.status !== "UNAVAILABLE" && i.status !== "REMOVED"
  );

  const pendingCount  = activeItems.filter((i) => i.status === "PENDING").length;
  const approvedCount = activeItems.filter((i) => i.status === "APPROVED").length;
  const rejectedCount = activeItems.filter((i) => i.status === "REJECTED").length;
  const deletingCount = activeItems.filter(
    (i) => i.scheduledForDeletionAt && !isGraceExpired(i.scheduledForDeletionAt)
  ).length;

  // ── Handlers ────────────────────────────────────────

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteItem(deleteTarget.id);
      if (result.error) {
        showToast(`เกิดข้อผิดพลาด: ${result.error}`);
      } else {
        showToast(`⏳ "${deleteTarget.title}" จะถูกลบภายใน 24 ชั่วโมง`);
        setDeleteTarget(null);
        router.refresh();
      }
    });
  }

  function handleCancelDeletion(item: MyItem) {
    startTransition(async () => {
      const result = await cancelDeletion(item.id);
      if (result.error) {
        showToast(`เกิดข้อผิดพลาด: ${result.error}`);
      } else {
        showToast(`✅ ยกเลิกการลบ "${item.title}" เรียบร้อยแล้ว`);
        router.refresh();
      }
    });
  }

  function getItemImage(item: MyItem) {
    return item.images.find((i) => i.isMain)?.url ?? item.images[0]?.url ?? null;
  }

  // ── Render ───────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111] mb-1">สินค้าของฉัน</h1>
        <p className="text-sm text-[#777]">สวัสดี, {userName} · จัดการรายการสินค้าของคุณ</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "สินค้าทั้งหมด", count: activeItems.length,  color: "text-[#111]",      bg: "bg-white"       },
          { label: "รอตรวจสอบ",    count: pendingCount,         color: "text-yellow-600",  bg: "bg-yellow-50"   },
          { label: "อนุมัติแล้ว",  count: approvedCount,        color: "text-green-600",   bg: "bg-green-50"    },
          { label: "ถูกปฏิเสธ",    count: rejectedCount,        color: "text-red-600",     bg: "bg-red-50"      },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-[#e5e3de]`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-[#777] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Deletion-pending warning strip */}
      {deletingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-orange-700">
            คุณมี <span className="font-bold">{deletingCount} สินค้า</span> ที่อยู่ในช่วงรอลบ กรุณาตรวจสอบด้านล่าง
          </p>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-[#111]">รายการสินค้า</h2>
        <a
          href="/"
          className="flex items-center gap-2 bg-[#e8500a] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#c94208] transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ลงประกาศใหม่
        </a>
      </div>

      {/* Empty state */}
      {activeItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e5e3de] p-16 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-[#111] mb-2">ยังไม่มีสินค้า</h3>
          <p className="text-sm text-[#777]">เริ่มลงประกาศสินค้าแรกของคุณเลย!</p>
        </div>
      )}

      {/* Items grid */}
      {activeItems.length > 0 && (
        <div className="grid gap-4">
          {activeItems.map((item) => {
            const imgUrl = getItemImage(item);

            // ── Grace-period state ──────────────────────
            const isScheduled = !!item.scheduledForDeletionAt;
            const expired     = isScheduled && isGraceExpired(item.scheduledForDeletionAt!);
            const expiry      = isScheduled ? expiryDate(item.scheduledForDeletionAt!) : null;

            // ── Card styles ──────────────────────────────
            const cardClass = isScheduled
              ? expired
                ? "bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-4 flex gap-4 items-start opacity-60"
                : "bg-red-50/40 rounded-2xl border-2 border-red-300 p-4 flex gap-4 items-start"
              : "bg-white rounded-2xl border border-[#e5e3de] p-4 flex gap-4 items-start hover:shadow-sm transition";

            return (
              <div key={item.id} className={cardClass}>
                {/* Thumbnail */}
                <div className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center ${isScheduled ? "bg-[#f0ede7] opacity-70" : "bg-[#f0ede7]"}`}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{item.emoji ?? item.category.emoji ?? "📦"}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className={`text-sm font-semibold truncate ${isScheduled ? "text-[#666] line-through" : "text-[#111]"}`}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#777] mt-0.5">{item.category.nameTh}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isScheduled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                          รอลบ
                        </span>
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <p className={`text-base font-bold mt-2 ${isScheduled ? "text-[#aaa] line-through" : "text-[#e8500a]"}`}>
                    ฿{item.price.toLocaleString()}
                    {item.listingType === "RENT" && <span className="text-xs font-normal">/เดือน</span>}
                  </p>

                  {/* ── Countdown banner (grace period active) ── */}
                  {isScheduled && !expired && expiry && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold text-red-700">กำลังจะถูกลบใน</span>
                        <CountdownTimer
                          targetDate={expiry}
                          className="text-xs font-bold text-red-700"
                          onExpire={() => router.refresh()}
                        />
                      </div>
                      <p className="text-[11px] text-red-600 leading-relaxed">
                        สินค้ายังปรากฏต่อผู้ซื้อพร้อมคำเตือน คุณสามารถยกเลิกได้ก่อนหมดเวลา
                      </p>
                    </div>
                  )}

                  {/* ── Expired grace period ── */}
                  {isScheduled && expired && (
                    <div className="mt-2 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-xs text-gray-500">หมดเวลา — สินค้าถูกลบออกจากหน้าหลักแล้ว</p>
                    </div>
                  )}

                  {/* Reject reason (normal items only) */}
                  {!isScheduled && item.status === "REJECTED" && item.rejectReason && (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs text-red-700">
                        <span className="font-semibold">เหตุผล:</span> {item.rejectReason}
                      </p>
                    </div>
                  )}

                  {/* Pending note (normal items only) */}
                  {!isScheduled && item.status === "PENDING" && (
                    <div className="mt-2 flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
                      <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-yellow-700">รอผู้ดูแลระบบตรวจสอบ อาจใช้เวลา 1–24 ชั่วโมง</p>
                    </div>
                  )}

                  {/* ── Action buttons ── */}
                  <div className="flex items-center gap-2 mt-3">
                    {isScheduled ? (
                      /* Grace period: only show Cancel button */
                      !expired && (
                        <button
                          onClick={() => handleCancelDeletion(item)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-300 bg-green-50 text-xs font-semibold text-green-700 hover:bg-green-100 transition disabled:opacity-50"
                        >
                          {isPending ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          )}
                          ยกเลิกการลบ
                        </button>
                      )
                    ) : (
                      /* Normal item: Edit + Delete — only for mutable statuses */
                      !["SOLD", "RENTED", "EXPIRED"].includes(item.status) && (
                        <>
                          <a
                            href={`/dashboard/edit/${item.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5e3de] text-xs font-medium text-[#333] hover:bg-[#f7f6f3] transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            แก้ไข
                          </a>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 text-xs font-medium text-orange-600 hover:bg-orange-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            ลบ
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isPending={isPending}
        />
      )}
    </>
  );
}
