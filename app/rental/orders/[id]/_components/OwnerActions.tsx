"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveRentalOrder, rejectRentalOrder } from "@/lib/actions/rental-transitions";
import type { RentalOrderStatus } from "@prisma/client";

interface Props {
  orderId: string;
  status: RentalOrderStatus;
}

export default function OwnerActions({ orderId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen]  = useState(false);
  const [reason, setReason]          = useState("");
  const [error, setError]            = useState<string | null>(null);

  if (status !== "REQUESTED") return null;

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const res = await approveRentalOrder(orderId);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  function handleReject() {
    if (!reason.trim()) { setError("กรุณาระบุเหตุผล"); return; }
    setError(null);
    startTransition(async () => {
      const res = await rejectRentalOrder(orderId, reason);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
      <h3 className="text-sm font-bold text-[#111]">🔔 มีคำขอเช่าใหม่</h3>
      <p className="text-xs text-[#777]">ผู้เช่าส่งคำขอมาแล้ว — กรุณาตอบรับหรือปฏิเสธภายใน 24 ชั่วโมง</p>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      {!rejectOpen ? (
        <div className="flex gap-3">
          <button
            onClick={() => setRejectOpen(true)}
            disabled={isPending}
            className="flex-1 py-2.5 border border-[#e5e3de] text-sm font-medium text-[#555]
                       rounded-xl hover:bg-[#f0ede7] transition disabled:opacity-50"
          >
            ปฏิเสธ
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-bold
                       rounded-xl hover:bg-green-700 transition disabled:opacity-50"
          >
            {isPending ? "กำลังดำเนินการ..." : "✅ ตอบรับ"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="เหตุผลที่ปฏิเสธ..."
            className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                       focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setRejectOpen(false); setReason(""); }}
              disabled={isPending}
              className="flex-1 py-2.5 border border-[#e5e3de] text-sm rounded-xl hover:bg-[#f0ede7]"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold
                         rounded-xl hover:bg-red-700 transition disabled:opacity-50"
            >
              {isPending ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
