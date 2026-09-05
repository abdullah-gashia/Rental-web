"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState } from "react";

interface Props {
  open: boolean;
  itemTitle: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function DeleteDialog({
  open, itemTitle, loading = false, onConfirm, onCancel,
}: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  if (!open) return null;

  const nameMatch = confirmText.trim() === itemTitle.trim();

  function handleClose() {
    setReason("");
    setConfirmText("");
    onCancel();
  }

  function handleConfirm() {
    if (!reason.trim() || !nameMatch) return;
    onConfirm(reason.trim());
    setReason("");
    setConfirmText("");
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : handleClose}
      />

      {/* Panel */}
      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-bold text-[var(--c-ink)] flex items-center gap-2">{tr("🗑️ ลบสินค้า &ldquo;{0}&rdquo; ถาวร", [itemTitle])}</h3>

        {/* Danger warning */}
        <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-3 py-2.5 text-sm text-[var(--c-danger)] flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <div>
            <p className="font-medium">{tr("การลบนี้ไม่สามารถย้อนกลับได้")}</p>
            <p className="text-xs mt-0.5 text-[var(--c-danger)]">{tr("สินค้าจะถูกเปลี่ยนสถานะเป็น &quot;ถูกลบ&quot; และไม่แสดงในระบบ")}</p>
          </div>
        </div>

        {/* Reason textarea */}
        <div>
          <label className="text-sm text-[var(--c-ink-2)] font-medium block mb-1.5">{tr("เหตุผลในการลบ")}<span className="text-[var(--c-danger)]">*</span>
          </label>
          <textarea
            className="w-full border border-[var(--c-line)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
            placeholder={tr("ระบุเหตุผลในการลบ...")}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Type-to-confirm */}
        <div>
          <label className="text-sm text-[var(--c-ink-2)] font-medium block mb-1.5">{tr("พิมพ์ชื่อสินค้า &ldquo;")}<span className="font-bold text-[var(--c-ink)]">{itemTitle}</span>{tr("&rdquo; เพื่อยืนยัน:")}</label>
          <input
            type="text"
            className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 transition ${
              confirmText.length > 0 && !nameMatch
                ? "border-[var(--c-danger-line)] focus:ring-red-200 focus:border-red-400"
                : "border-[var(--c-line)] focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
            }`}
            placeholder={itemTitle}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>

        {/* Warning */}
        <div className="bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-3 py-2 text-xs text-[var(--c-warn)] flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{tr("ผู้ขายจะได้รับแจ้งเตือนการลบพร้อมเหตุผล")}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || !nameMatch}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            ลบถาวร
          </button>
        </div>
      </div>
    </div>
  );
}
