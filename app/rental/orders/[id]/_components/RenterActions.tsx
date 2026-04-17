"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelRentalOrder, requestRentalReturn } from "@/lib/actions/rental-transitions";
import type { RentalOrderStatus } from "@prisma/client";

interface Props {
  orderId: string;
  status: RentalOrderStatus;
}

export default function RenterActions({ orderId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen]  = useState(false);
  const [reason, setReason]          = useState("");
  const [error, setError]            = useState<string | null>(null);

  const canCancel  = ["REQUESTED", "APPROVED"].includes(status);
  const canReturn  = ["ACTIVE", "OVERDUE"].includes(status);

  if (!canCancel && !canReturn) return null;

  function handleReturn() {
    startTransition(async () => {
      const res = await requestRentalReturn(orderId);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  function handleCancel() {
    if (!reason.trim()) { setError("กรุณาระบุเหตุผล"); return; }
    startTransition(async () => {
      const res = await cancelRentalOrder(orderId, reason);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-3">
      <h3 className="text-sm font-bold text-[#111]">การดำเนินการ</h3>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      {canReturn && !cancelOpen && (
        <button
          onClick={handleReturn}
          disabled={isPending}
          className="w-full py-3 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                     hover:bg-[#c94208] transition disabled:opacity-50"
        >
          {isPending ? "กำลังดำเนินการ..." : "📦 แจ้งคืนของ"}
        </button>
      )}

      {canCancel && !cancelOpen && (
        <button
          onClick={() => setCancelOpen(true)}
          disabled={isPending}
          className="w-full py-2.5 border border-red-200 text-red-600 text-sm rounded-xl
                     hover:bg-red-50 transition"
        >
          ยกเลิกคำขอ
        </button>
      )}

      {cancelOpen && (
        <div className="space-y-3">
          <p className="text-xs text-[#777]">เงินจะถูกคืนเข้ากระเป๋าหลังจากยกเลิก</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="เหตุผลที่ยกเลิก..."
            className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                       focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setCancelOpen(false); setReason(""); }}
              disabled={isPending}
              className="flex-1 py-2.5 border border-[#e5e3de] text-sm rounded-xl hover:bg-[#f0ede7]"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold
                         rounded-xl hover:bg-red-700 transition disabled:opacity-50"
            >
              {isPending ? "กำลังดำเนินการ..." : "ยืนยันยกเลิก"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
