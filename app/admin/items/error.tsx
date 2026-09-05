"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

export default function ItemsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const tr = useLocaleStore((s) => s.tr);
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-base font-semibold text-[var(--c-ink)]">{tr("โหลดข้อมูลสินค้าไม่สำเร็จ")}</h2>
      <p className="text-sm text-[var(--c-ink-3)]">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-semibold bg-[var(--c-accent)] text-white rounded-xl hover:bg-[var(--c-accent-str)] transition"
      >{tr("ลองใหม่")}</button>
    </div>
  );
}
