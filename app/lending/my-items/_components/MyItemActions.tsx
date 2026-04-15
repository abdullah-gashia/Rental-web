"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toggleLendingItemAvailability, deleteLendingItem } from "@/lib/actions/lending-items";
import type { LendingItemStatus } from "@prisma/client";

interface Props {
  itemId: string;
  status: LendingItemStatus;
}

export default function MyItemActions({ itemId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function show(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
    router.refresh();
  }

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleLendingItemAvailability(itemId);
      show(res.success, res.success ? "อัปเดตสถานะแล้ว" : (res.error ?? "เกิดข้อผิดพลาด"));
    });
  }

  function handleDelete() {
    if (!confirm("ลบรายการนี้? ไม่สามารถกู้คืนได้")) return;
    startTransition(async () => {
      const res = await deleteLendingItem(itemId);
      if (res.success) {
        show(true, "ลบแล้ว");
      } else {
        show(false, res.error ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  const canToggle = status === "AVAILABLE" || status === "UNAVAILABLE";

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[600] px-4 py-2.5 rounded-xl shadow text-sm font-medium text-white ${
          toast.ok ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {canToggle && (
        <button
          onClick={handleToggle}
          disabled={pending}
          className="px-3 py-1.5 text-xs border border-[#e5e3de] rounded-xl text-[#555]
                     hover:bg-[#f0ede7] transition disabled:opacity-50"
        >
          {status === "AVAILABLE" ? "ปิดชั่วคราว" : "เปิดใหม่"}
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={pending || status === "LENT_OUT"}
        title={status === "LENT_OUT" ? "ไม่สามารถลบได้ขณะยืมอยู่" : "ลบ"}
        className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-xl
                   hover:bg-red-50 transition disabled:opacity-40"
      >
        ลบ
      </button>
    </div>
  );
}
