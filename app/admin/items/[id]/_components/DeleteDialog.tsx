"use client";

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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-bold text-[#111] flex items-center gap-2">
          🗑️ ลบสินค้า &ldquo;{itemTitle}&rdquo; ถาวร
        </h3>

        {/* Danger warning */}
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <div>
            <p className="font-medium">การลบนี้ไม่สามารถย้อนกลับได้</p>
            <p className="text-xs mt-0.5 text-red-600">สินค้าจะถูกเปลี่ยนสถานะเป็น &quot;ถูกลบ&quot; และไม่แสดงในระบบ</p>
          </div>
        </div>

        {/* Reason textarea */}
        <div>
          <label className="text-sm text-[#555] font-medium block mb-1.5">
            เหตุผลในการลบ <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full border border-[#e5e3de] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
            placeholder="ระบุเหตุผลในการลบ..."
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Type-to-confirm */}
        <div>
          <label className="text-sm text-[#555] font-medium block mb-1.5">
            พิมพ์ชื่อสินค้า &ldquo;<span className="font-bold text-[#111]">{itemTitle}</span>&rdquo; เพื่อยืนยัน:
          </label>
          <input
            type="text"
            className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 transition ${
              confirmText.length > 0 && !nameMatch
                ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                : "border-[#e5e3de] focus:ring-[#e8500a]/20 focus:border-[#e8500a]"
            }`}
            placeholder={itemTitle}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>ผู้ขายจะได้รับแจ้งเตือนการลบพร้อมเหตุผล</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-50"
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
