"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveLendingRequest, rejectLendingRequest } from "@/lib/actions/lending-orders";

interface Props {
  orderId: string;
  status: string;
}

export default function LenderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [pickup, setPickup] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (status !== "REQUESTED") return null;

  function handleApprove() {
    if (!pickup) { setError("กรุณาระบุวันนัดรับของ"); return; }
    setError(null);
    startTransition(async () => {
      const res = await approveLendingRequest(orderId, new Date(pickup));
      if (res.success) router.refresh();
      else setError(res.error ?? "เกิดข้อผิดพลาด");
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) { setError("กรุณาระบุเหตุผล"); return; }
    setError(null);
    startTransition(async () => {
      const res = await rejectLendingRequest(orderId, rejectReason.trim());
      if (res.success) router.refresh();
      else setError(res.error ?? "เกิดข้อผิดพลาด");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-4">
      <h3 className="text-sm font-bold text-[#111]">⚡ รอการตอบรับของคุณ</h3>
      <p className="text-xs text-[#777]">กรุณาตอบรับหรือปฏิเสธภายใน 24 ชั่วโมง</p>

      {!showReject ? (
        <>
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">วันนัดรับของ *</label>
            <input
              type="datetime-local"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#e5e3de] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={pending}
              className="flex-1 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl
                         hover:bg-green-700 transition disabled:opacity-50"
            >
              {pending ? "..." : "✅ อนุมัติ"}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={pending}
              className="px-4 py-2.5 border border-red-300 text-red-600 text-sm font-medium rounded-xl
                         hover:bg-red-50 transition"
            >
              ❌ ปฏิเสธ
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="text-xs font-semibold text-[#555] block mb-1.5">เหตุผลที่ปฏิเสธ *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="เช่น ของไม่ว่างในช่วงนี้..."
              className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                         focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowReject(false)}
              className="flex-1 py-2.5 border border-[#e5e3de] text-sm text-[#555] rounded-xl hover:bg-[#f0ede7]"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleReject}
              disabled={pending}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "..." : "ยืนยันปฏิเสธ"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
