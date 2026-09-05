"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelRentalOrder, requestRentalReturn } from "@/lib/actions/rental-transitions";
import type { RentalOrderStatus } from "@prisma/client";

interface Props {
  orderId: string;
  status: RentalOrderStatus;
}

export default function RenterActions({ orderId, status }: Props) {
  const tr = useLocaleStore((s) => s.tr);
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
      if (!res.success) setError(tr(res.error));
      else router.refresh();
    });
  }

  function handleCancel() {
  const tr = useLocaleStore((s) => s.tr);
    if (!reason.trim()) { setError(tr("กรุณาระบุเหตุผล")); return; }
    startTransition(async () => {
      const res = await cancelRentalOrder(orderId, reason);
      if (!res.success) setError(tr(res.error));
      else router.refresh();
    });
  }

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 space-y-3">
      <h3 className="text-sm font-bold text-[var(--c-ink)]">{tr("การดำเนินการ")}</h3>

      {error && (
        <div className="bg-[var(--c-danger-soft)] text-[var(--c-danger)] text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      {canReturn && !cancelOpen && (
        <button
          onClick={handleReturn}
          disabled={isPending}
          className="w-full py-3 bg-[var(--c-accent)] text-white text-sm font-bold rounded-xl
                     hover:bg-[var(--c-accent-str)] transition disabled:opacity-50"
        >
          {isPending ? tr("กำลังดำเนินการ...") : tr("📦 แจ้งคืนของ")}
        </button>
      )}

      {canCancel && !cancelOpen && (
        <button
          onClick={() => setCancelOpen(true)}
          disabled={isPending}
          className="w-full py-2.5 border border-[var(--c-danger-line)] text-[var(--c-danger)] text-sm rounded-xl
                     hover:bg-[var(--c-danger-soft)] transition"
        >{tr("ยกเลิกคำขอ")}</button>
      )}

      {cancelOpen && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--c-ink-3)]">{tr("เงินจะถูกคืนเข้ากระเป๋าหลังจากยกเลิก")}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={tr("เหตุผลที่ยกเลิก...")}
            className="w-full px-3 py-2 text-sm border border-[var(--c-line)] rounded-xl resize-none
                       focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setCancelOpen(false); setReason(""); }}
              disabled={isPending}
              className="flex-1 py-2.5 border border-[var(--c-line)] text-sm rounded-xl hover:bg-[var(--c-line-soft)]"
            >{tr("ยกเลิก")}</button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold
                         rounded-xl hover:bg-red-700 transition disabled:opacity-50"
            >
              {isPending ? tr("กำลังดำเนินการ...") : tr("ยืนยันยกเลิก")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
