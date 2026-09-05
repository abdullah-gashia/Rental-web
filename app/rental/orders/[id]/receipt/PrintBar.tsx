"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

interface Props {
  title: string;
}

export default function PrintBar({ title }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  return (
    <div className="no-print fixed top-0 left-0 right-0 bg-[var(--c-surface)] border-b border-[var(--c-line)] px-6 py-3
                    flex items-center justify-between z-50 shadow-sm print:hidden">
      <span className="text-sm font-semibold text-[var(--c-ink-2)]">{title}</span>
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-[var(--c-accent)] text-white text-sm font-semibold rounded-lg
                     hover:bg-[var(--c-accent-str)] transition"
        >{tr("🖨️ พิมพ์ / บันทึก PDF")}</button>
        <button
          onClick={() => window.close()}
          className="px-4 py-1.5 border border-[var(--c-line)] text-[var(--c-ink-3)] text-sm rounded-lg hover:bg-[var(--c-subtle)]"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
