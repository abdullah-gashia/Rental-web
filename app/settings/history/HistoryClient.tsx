"use client";

import { useState, useTransition } from "react";
import { deleteInteraction, clearAllHistory, toggleTracking, getUserHistory } from "./actions";

type HistoryItem = {
  id:        string;
  createdAt: string;
  category:  string;
  item: {
    id:           string;
    title:        string;
    price:        number;
    emoji:        string | null;
    thumbnailUrl: string | null;
    categoryTh:   string;
  };
};

type HistoryResult = {
  interactions: HistoryItem[];
  total:        number;
  page:         number;
  pageSize:     number;
  totalPages:   number;
};

interface Props {
  initialHistory:  HistoryResult;
  trackingEnabled: boolean;
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} ชม. ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "เมื่อวาน";
  return `${days} วันที่แล้ว`;
}

export default function HistoryClient({ initialHistory, trackingEnabled: initialTracking }: Props) {
  const [history,  setHistory]  = useState<HistoryResult>(initialHistory);
  const [tracking, setTracking] = useState(initialTracking);
  const [pending,  start]       = useTransition();
  const [toast,    setToast]    = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function showMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function refreshPage(page: number) {
    const result = await getUserHistory(page, 20);
    setHistory(result);
  }

  function handleDelete(id: string) {
    start(async () => {
      const res = await deleteInteraction(id);
      if (res.success) {
        setHistory((h) => ({
          ...h,
          interactions: h.interactions.filter((i) => i.id !== id),
          total:        h.total - 1,
        }));
        showMessage("ลบรายการแล้ว");
      }
    });
  }

  function handleClearAll() {
    start(async () => {
      const res = await clearAllHistory();
      if (res.success) {
        setHistory((h) => ({ ...h, interactions: [], total: 0 }));
        setShowClearConfirm(false);
        showMessage("ล้างประวัติทั้งหมดแล้ว");
      }
    });
  }

  function handleToggleTracking() {
    const next = !tracking;
    start(async () => {
      const res = await toggleTracking(next);
      if (res.success) {
        setTracking(next);
        showMessage(next ? "เปิดการบันทึกประวัติแล้ว" : "หยุดบันทึกประวัติแล้ว");
      }
    });
  }

  // Group by day label
  const groups: { label: string; items: HistoryItem[] }[] = [];
  const seen = new Map<string, number>();

  for (const ix of history.interactions) {
    const d    = new Date(ix.createdAt);
    const now  = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    const label =
      diffDays === 0 ? "วันนี้" :
      diffDays === 1 ? "เมื่อวาน" :
      d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

    const idx = seen.get(label);
    if (idx === undefined) {
      seen.set(label, groups.length);
      groups.push({ label, items: [ix] });
    } else {
      groups[idx].items.push(ix);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
        {/* Header */}
        <div>
          <a href="/" className="text-sm text-[#9a9590] hover:text-[#111] transition">
            ← กลับหน้าหลัก
          </a>
          <h1 className="text-2xl font-bold text-[#111] mt-3">ประวัติการเข้าชม</h1>
          <p className="text-sm text-[#777] mt-1">
            สินค้าที่คุณเคยดูจะถูกใช้เพื่อแนะนำสินค้าที่ตรงใจคุณ
          </p>
        </div>

        {/* Control bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle tracking */}
          <button
            onClick={handleToggleTracking}
            disabled={pending}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition disabled:opacity-50 ${
              tracking
                ? "bg-white border-[#e5e3de] text-[#555] hover:border-[#111]"
                : "bg-[#111] border-[#111] text-white"
            }`}
          >
            {tracking ? "⏸ หยุดบันทึกชั่วคราว" : "▶ เปิดการบันทึก"}
          </button>

          {history.total > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={pending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition disabled:opacity-50"
            >
              🗑 ล้างประวัติทั้งหมด ({history.total})
            </button>
          )}
        </div>

        {/* Confirm clear dialog */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowClearConfirm(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h3 className="font-bold text-[#111]">ล้างประวัติทั้งหมด?</h3>
              <p className="text-sm text-[#555]">ข้อมูลการแนะนำสินค้าจะถูกรีเซ็ต คุณจะเห็นสินค้ายอดนิยมแทน</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition disabled:opacity-50"
                >
                  ล้างทั้งหมด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History list */}
        {history.total === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e5e3de] py-16 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm font-semibold text-[#333]">ยังไม่มีประวัติการเข้าชม</p>
            <p className="text-xs text-[#9a9590] mt-1">เริ่มดูสินค้าเพื่อรับการแนะนำที่ตรงใจ</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden divide-y divide-[#f0ede7]">
            {groups.map((group) => (
              <div key={group.label}>
                {/* Day label */}
                <div className="px-4 py-2.5 bg-[#faf9f7]">
                  <p className="text-xs font-bold text-[#9a9590] uppercase tracking-wide">{group.label}</p>
                </div>
                {group.items.map((ix) => (
                  <div key={ix.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#faf9f7] transition">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#f0ede7] flex items-center justify-center">
                      {ix.item.thumbnailUrl ? (
                        <img src={ix.item.thumbnailUrl} alt={ix.item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{ix.item.emoji ?? "📦"}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111] truncate">{ix.item.title}</p>
                      <p className="text-xs text-[#9a9590]">
                        {ix.item.categoryTh} · {relativeTime(ix.createdAt)}
                      </p>
                    </div>

                    {/* Price */}
                    <p className="text-sm font-semibold text-[#111] flex-shrink-0">
                      ฿{ix.item.price.toLocaleString()}
                    </p>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(ix.id)}
                      disabled={pending}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9a9590] hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40 flex-shrink-0"
                      aria-label="ลบรายการนี้"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {history.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#777]">
              หน้า {history.page} / {history.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => refreshPage(history.page - 1)}
                disabled={history.page === 1 || pending}
                className="px-3 py-1.5 text-sm border border-[#e5e3de] rounded-lg disabled:opacity-30 hover:bg-[#f0ede7] transition"
              >
                ← ก่อนหน้า
              </button>
              <button
                onClick={() => refreshPage(history.page + 1)}
                disabled={history.page >= history.totalPages || pending}
                className="px-3 py-1.5 text-sm border border-[#e5e3de] rounded-lg disabled:opacity-30 hover:bg-[#f0ede7] transition"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
