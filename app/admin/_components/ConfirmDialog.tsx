"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

interface ConfirmDialogProps {
  open:          boolean;
  title:         string;
  description:   string;
  confirmLabel?: string;
  danger?:       boolean;
  loading?:      boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
  children?:     React.ReactNode; // extra content (e.g. reason textarea)
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "ยืนยัน",
  danger       = false,
  loading      = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const tr = useTr();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      role="dialog"
      aria-modal
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      {/* Panel */}
      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 id="confirm-title" className="text-base font-bold text-[var(--c-ink)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--c-ink-2)] leading-relaxed">{description}</p>

        {/* Optional extra content (reason input etc.) */}
        {children && <div>{children}</div>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
          >{tr("ยกเลิก")}</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
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
