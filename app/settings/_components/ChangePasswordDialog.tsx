"use client";

import { useState, useEffect, useTransition } from "react";
import { changePassword } from "../actions";

interface Props {
  open: boolean;
  onClose: () => void;
  showToast: (ok: boolean, msg: string) => void;
}

/** One password field with its own show/hide toggle. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoFocus,
  disabled,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#333] mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-[#e5e3de] bg-white text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#9a9590] hover:text-[#333] transition"
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordDialog({ open, onClose, showToast }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Never leave a typed password sitting in state after the dialog closes
  useEffect(() => {
    if (!open) {
      setCurrent(""); setNext(""); setConfirm(""); setError(null);
    }
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  // Only what the feature cannot work without — no length or complexity rule
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = !!current && !!next && next === confirm && !pending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      const res = await changePassword({
        currentPassword: current,
        newPassword:     next,
        confirmPassword: confirm,
      });

      if (res.success) {
        showToast(true, res.message);
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      role="dialog"
      aria-modal
      aria-labelledby="change-password-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={pending ? undefined : onClose}
      />

      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div>
          <h3 id="change-password-title" className="text-base font-bold text-[#111] flex items-center gap-2">
            🔑 เปลี่ยนรหัสผ่าน
          </h3>
          <p className="text-xs text-[#9a9590] mt-1">
            ยืนยันรหัสผ่านปัจจุบันก่อน แล้วตั้งรหัสผ่านใหม่ตามต้องการ
          </p>
        </div>

        <div className="space-y-3.5">
          <PasswordField
            id="cp-current"
            label="รหัสผ่านปัจจุบัน"
            value={current}
            onChange={(v) => { setCurrent(v); setError(null); }}
            autoFocus
            disabled={pending}
            autoComplete="current-password"
          />

          <div className="border-t border-[#e5e3de] pt-3.5 space-y-3.5">
            <PasswordField
              id="cp-new"
              label="รหัสผ่านใหม่"
              value={next}
              onChange={(v) => { setNext(v); setError(null); }}
              disabled={pending}
              autoComplete="new-password"
            />

            <div>
              <PasswordField
                id="cp-confirm"
                label="ยืนยันรหัสผ่านใหม่"
                value={confirm}
                onChange={(v) => { setConfirm(v); setError(null); }}
                disabled={pending}
                autoComplete="new-password"
              />
              {mismatch && (
                <p className="text-[11px] text-red-600 mt-1.5">
                  รหัสผ่านใหม่และการยืนยันยังไม่ตรงกัน
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Server-side error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700"
          >
            <svg className="w-4 h-4 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 py-2.5 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl bg-[#e8500a] hover:bg-[#c94208] text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            ยืนยันเปลี่ยนรหัสผ่าน
          </button>
        </div>
      </form>
    </div>
  );
}
