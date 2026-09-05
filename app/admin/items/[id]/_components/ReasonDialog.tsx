"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState } from "react";

const COMMON_REASONS = [
  "รูปภาพไม่เหมาะสม",
  "ราคาผิดปกติ",
  "สินค้าผิดกฎหมาย",
  "ข้อมูลเป็นเท็จ",
  "ซ้ำกับสินค้าอื่น",
];

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function ReasonDialog({
  open, title, confirmLabel, danger = false, loading = false, onConfirm, onCancel,
}: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [reason, setReason] = useState("");

  if (!open) return null;

  function handleClose() {
    setReason("");
    onCancel();
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
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
        <h3 className="text-base font-bold text-[var(--c-ink)]">{title}</h3>

        {/* Reason textarea */}
        <div>
          <label className="text-sm text-[var(--c-ink-2)] font-medium block mb-1.5">{tr("เหตุผล")}<span className="text-[var(--c-danger)]">*</span>
          </label>
          <textarea
            className="w-full border border-[var(--c-line)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)] transition"
            placeholder={tr("ระบุเหตุผล...")}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-[var(--c-faint)] text-right mt-1">{reason.length}/500</p>
        </div>

        {/* Quick reason chips */}
        <div>
          <p className="text-xs text-[var(--c-faint)] mb-2">{tr("เหตุผลที่พบบ่อย:")}</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  reason === r
                    ? "bg-[var(--c-accent)] text-white border-[var(--c-accent)]"
                    : "bg-[var(--c-subtle)] text-[var(--c-ink-2)] border-[var(--c-line)] hover:border-[#c5c2bc]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-3 py-2 text-xs text-[var(--c-warn)] flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{tr("ผู้ขายจะได้รับแจ้งเตือนพร้อมเหตุผล")}</span>
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
            disabled={loading || !reason.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[var(--c-accent)] hover:bg-[var(--c-accent-str)]"
            }`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
