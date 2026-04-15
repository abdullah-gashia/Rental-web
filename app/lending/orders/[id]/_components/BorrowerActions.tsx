"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelLendingOrder, requestReturn } from "@/lib/actions/lending-orders";

interface Props {
  orderId: string;
  status: string;
}

export default function BorrowerActions({ orderId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!reason.trim()) { setError("กรุณาระบุเหตุผล"); return; }
    startTransition(async () => {
      const res = await cancelLendingOrder(orderId, reason.trim());
      if (res.success) router.refresh();
      else setError(res.error ?? "เกิดข้อผิดพลาด");
    });
  }

  function handleReturnRequest() {
    if (!returnDate) { setError("กรุณาระบุวันนัดคืน"); return; }
    startTransition(async () => {
      const res = await requestReturn(orderId, new Date(returnDate));
      if (res.success) { setShowReturn(false); router.refresh(); }
      else setError(res.error ?? "เกิดข้อผิดพลาด");
    });
  }

  const cancellable = ["REQUESTED", "APPROVED", "DEPOSIT_HELD"].includes(status);
  const returnable = ["ACTIVE", "OVERDUE"].includes(status);

  if (!cancellable && !returnable) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-3">
      <h3 className="text-sm font-bold text-[#111]">การดำเนินการ</h3>

      {returnable && !showReturn && (
        <button
          onClick={() => setShowReturn(true)}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl
                     hover:bg-blue-700 transition"
        >
          📦 แจ้งคืนของ
        </button>
      )}

      {showReturn && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">วันนัดคืน *</label>
            <input
              type="datetime-local"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowReturn(false)} className="flex-1 py-2 border border-[#e5e3de] text-sm text-[#555] rounded-xl">
              ยกเลิก
            </button>
            <button onClick={handleReturnRequest} disabled={pending}
              className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">
              {pending ? "..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      )}

      {cancellable && !showCancel && (
        <button
          onClick={() => setShowCancel(true)}
          className="w-full py-2.5 border border-red-300 text-red-600 text-sm font-medium rounded-xl
                     hover:bg-red-50 transition"
        >
          🚫 ยกเลิกคำขอ
        </button>
      )}

      {showCancel && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">เหตุผลที่ยกเลิก *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                         focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowCancel(false)} className="flex-1 py-2 border border-[#e5e3de] text-sm text-[#555] rounded-xl">
              ยกเลิก
            </button>
            <button onClick={handleCancel} disabled={pending}
              className="flex-1 py-2 bg-red-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">
              {pending ? "..." : "ยืนยันยกเลิก"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
