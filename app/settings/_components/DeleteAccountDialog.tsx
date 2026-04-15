"use client";

import { useState, useTransition } from "react";
import { requestAccountDeletion } from "../actions";
import { logout } from "@/lib/actions/auth-actions";

interface Props {
  open: boolean;
  onClose: () => void;
  showToast: (ok: boolean, msg: string) => void;
}

export default function DeleteAccountDialog({ open, onClose, showToast }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const confirmed = confirmText === "ลบบัญชีของฉัน";

  const handleDelete = () => {
    if (!confirmed) return;
    startTransition(async () => {
      const res = await requestAccountDeletion();
      if (res.success) {
        showToast(true, res.message);
        // Sign out after short delay so user sees the message
        setTimeout(async () => {
          await logout();
          window.location.href = "/";
        }, 2000);
      } else {
        showToast(false, res.error);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      role="dialog"
      aria-modal
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={pending ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-bold text-red-700 flex items-center gap-2">
          ⚠️ ยืนยันการลบบัญชี
        </h3>

        <div className="text-sm text-[#555] space-y-2">
          <p>
            การดำเนินการนี้<strong>ไม่สามารถย้อนกลับได้</strong> ข้อมูลทั้งหมดจะถูกลบถาวรใน 30 วัน
          </p>
          <p>
            พิมพ์ <span className="font-bold text-red-600">ลบบัญชีของฉัน</span> เพื่อยืนยัน:
          </p>
        </div>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="พิมพ์ข้อความยืนยัน..."
          disabled={pending}
          className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50/30 text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-red-300 transition"
        />

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
            type="button"
            onClick={handleDelete}
            disabled={!confirmed || pending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            ลบบัญชีถาวร
          </button>
        </div>
      </div>
    </div>
  );
}
