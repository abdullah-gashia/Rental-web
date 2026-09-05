"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4 select-none">⚠️</div>
      <h2 className="text-lg font-bold text-[var(--c-ink)] mb-2">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </h2>
      <p className="text-sm text-[var(--c-ink-3)] max-w-sm mb-6">
        กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ โปรดติดต่อนักพัฒนา
        {error.digest && (
          <span className="block mt-1 font-mono text-xs text-[var(--c-faint-2)]">
            [{error.digest}]
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 bg-[var(--c-accent)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--c-accent-str)] transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        ลองใหม่
      </button>
    </div>
  );
}
