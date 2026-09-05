"use client";

import { useState, useTransition } from "react";
import { deleteItem, cancelDeletion } from "@/lib/actions/item-actions";
import { useToastStore } from "@/lib/stores/toast-store";
import { useRouter } from "next/navigation";
import CountdownTimer from "@/components/ui/CountdownTimer";
import ReputationPanel, { type Reputation } from "./ReputationPanel";

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
  reputation: Reputation | null;
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
  RENTED:      { label: "ให้เช่าอยู่",  bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-400" },
  EXPIRED:     { label: "หมดอายุ",     bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400"   },
};

// ─── Filters ──────────────────────────────────────────

type FilterKey = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "SOLD" | "RENTED" | "DELETING";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL",      label: "ทั้งหมด"     },
  { key: "PENDING",  label: "รอตรวจสอบ"   },
  { key: "APPROVED", label: "อนุมัติแล้ว" },
  { key: "RENTED",   label: "ให้เช่าอยู่"  },
  { key: "SOLD",     label: "ขายแล้ว"     },
  { key: "REJECTED", label: "ถูกปฏิเสธ"   },
  { key: "DELETING", label: "รอลบ"        },
];

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
        <h3 className="text-lg font-bold text-[#0f1e35] text-center mb-2">กำหนดลบสินค้า?</h3>
        <p className="text-sm text-[#3d4d66] text-center mb-1 px-2">
          สินค้า <span className="font-semibold">&ldquo;{item.title}&rdquo;</span> จะถูกลบออกหลังจาก
        </p>
        <p className="text-sm font-bold text-orange-600 text-center mb-4">24 ชั่วโมง</p>
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 text-xs text-orange-700 text-center">
          คุณสามารถ <span className="font-semibold">ยกเลิก</span>การลบได้ตลอดระหว่าง 24 ชั่วโมงนี้
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#dfe7f2] text-sm font-medium text-[#3d4d66] hover:bg-[#f1f5fb] transition"
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

export default function MyItemsClient({ items, userName, reputation }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<MyItem | null>(null);
  const [filter, setFilter]             = useState<FilterKey>("ALL");
  const [isPending, startTransition]    = useTransition();
  const showToast = useToastStore((s) => s.show);
  const router    = useRouter();

  // Items to show: exclude hard-deleted; soft-deleted ones stay visible
  const activeItems = items.filter(
    (i) => i.status !== "UNAVAILABLE" && i.status !== "REMOVED"
  );

  /** "รอลบ" means scheduled and still inside the 24-h window it can be undone in. */
  function isDeleting(i: MyItem) {
    return !!i.scheduledForDeletionAt && !isGraceExpired(i.scheduledForDeletionAt);
  }

  function matches(i: MyItem, key: FilterKey) {
    if (key === "ALL")      return true;
    if (key === "DELETING") return isDeleting(i);
    // A listing waiting to be deleted still carries its old status, so it would
    // otherwise show up under "อนุมัติแล้ว" as though nothing were happening.
    if (isDeleting(i)) return false;
    return i.status === key;
  }

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, activeItems.filter((i) => matches(i, f.key)).length]),
  ) as Record<FilterKey, number>;

  const visibleItems = activeItems.filter((i) => matches(i, filter));

  const pendingCount  = counts.PENDING;
  const approvedCount = counts.APPROVED;
  const deletingCount = counts.DELETING;

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
      <header className="ui-head">
        <div>
          <p className="ui-eyebrow mb-1.5">ที่ฉันขาย</p>
          <h1>ประกาศของฉัน</h1>
          <p>
            {activeItems.length === 0
              ? "ยังไม่มีประกาศ — ลงชิ้นแรกได้จากหน้าร้าน"
              : `${activeItems.length} ประกาศ · เผยแพร่อยู่ ${approvedCount} · รอตรวจสอบ ${pendingCount}`}
          </p>
        </div>
        <a href="/" className="ui-btn ui-btn-primary">ลงประกาศใหม่</a>
      </header>

      {/* Deletion-pending warning strip */}
      {deletingCount > 0 && (
        <div className="ui-note ui-note-warn mb-5 flex items-center justify-between gap-3 flex-wrap">
          <span>
            คุณมี <strong>{deletingCount} ประกาศ</strong> ที่อยู่ในช่วงรอลบ ยกเลิกได้ก่อนหมดเวลา
          </span>
          <button onClick={() => setFilter("DELETING")} className="ui-btn ui-btn-ghost ui-btn-sm">
            ดูรายการ
          </button>
        </div>
      )}

      {/* Filter chips — these are also the counts, so there is no separate
          stat row saying the same numbers a second time. */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 pb-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`ui-chip flex-shrink-0 ${filter === f.key ? "is-on" : ""}`}
          >
            {f.label}
            <span className="ui-chip-n">{counts[f.key]}</span>
          </button>
        ))}
      </div>


      {/* Empty state */}
      {visibleItems.length === 0 && (
        <div className="ui-card ui-empty">
          <div className="ui-empty-icon">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7.5 12 3.5 4 7.5m16 0-8 4m8-4V16l-8 4m0-8.5L4 7.5m8 4V20M4 7.5V16l8 4" />
            </svg>
          </div>
          {activeItems.length === 0 ? (
            <>
              <h3>ยังไม่มีประกาศ</h3>
              <p>ลงประกาศชิ้นแรกจากหน้าร้าน แล้วรายการจะมาอยู่ที่นี่พร้อมสถานะการตรวจสอบ</p>
              <a href="/" className="ui-btn ui-btn-primary mt-4">ลงประกาศใหม่</a>
            </>
          ) : (
            <>
              <h3>ไม่มีประกาศในหมวด &ldquo;{FILTERS.find((f) => f.key === filter)?.label}&rdquo;</h3>
              <p>ลองเลือกหมวดอื่น หรือดูประกาศทั้งหมดของคุณ</p>
              <button onClick={() => setFilter("ALL")} className="ui-btn ui-btn-ghost mt-4">
                ดูทั้งหมด
              </button>
            </>
          )}
        </div>
      )}

      {/* Items grid */}
      {visibleItems.length > 0 && (
        <div className="grid gap-4">
          {visibleItems.map((item) => {
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
              : "bg-white rounded-2xl border border-[#dfe7f2] p-4 flex gap-4 items-start hover:shadow-sm transition";

            return (
              <div key={item.id} className={cardClass}>
                {/* Thumbnail */}
                <div className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center ${isScheduled ? "bg-[#eaf0f8] opacity-70" : "bg-[#eaf0f8]"}`}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={item.title} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl">{item.emoji ?? item.category.emoji ?? "📦"}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className={`text-sm font-semibold truncate ${isScheduled ? "text-[#666] line-through" : "text-[#0f1e35]"}`}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#5b6b82] mt-0.5">{item.category.nameTh}</p>
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
                  <p className={`text-base font-bold mt-2 ${isScheduled ? "text-[#94a3b8] line-through" : "text-[#2563eb]"}`}>
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dfe7f2] text-xs font-medium text-[#1e2d47] hover:bg-[#f1f5fb] transition"
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

      {/* Rating and reviews. Below the listings on purpose — a seller opens
          this page to manage what they are selling, not to read their score. */}
      {reputation && (
        <div className="mt-8">
          <ReputationPanel reputation={reputation} />
        </div>
      )}
    </>
  );
}
