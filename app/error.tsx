"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import { useEffect } from "react";

/**
 * The error boundary.
 *
 * Next's default is an unstyled stack-trace page in development and a bare
 * "Application error" in production — neither tells a student anything useful.
 * This keeps the site's face on, offers the one thing that usually works
 * (try again), and shows the digest so a report to the team is actionable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tr = useTr();
  useEffect(() => {
    // The message can carry query text and ids, so it goes to the console for
    // whoever is debugging — never onto the page.
    console.error("[page error]", error);
  }, [error]);

  return (
    <main className="ui-shell flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-[480px] text-center">
        <div className="ui-empty-icon !w-12 !h-12 !bg-[var(--c-danger-soft)] !text-[var(--c-danger)]">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 9v4.5M12 17h.01M10.3 4.3 2.6 17.7A1.5 1.5 0 0 0 3.9 20h16.2a1.5 1.5 0 0 0 1.3-2.3L13.7 4.3a2 2 0 0 0-3.4 0z" />
          </svg>
        </div>

        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] mt-1">{tr("หน้านี้โหลดไม่สำเร็จ")}</h1>
        <p className="text-[13.5px] text-[var(--hp-muted)] mt-2.5 leading-[1.9]">{tr("เกิดข้อผิดพลาดระหว่างเตรียมข้อมูล ลองใหม่อีกครั้งได้เลย — ถ้ายังเป็นเหมือนเดิม ช่วยแจ้งทีมงานพร้อมรหัสด้านล่าง")}</p>

        {error.digest && (
          <p className="ui-num text-[11.5px] text-[var(--hp-muted)] mt-3 font-mono">{tr("รหัสอ้างอิง: {0}", [error.digest])}</p>
        )}

        <div className="flex items-center justify-center gap-2.5 mt-6">
          <button onClick={reset} className="ui-btn ui-btn-primary">{tr("ลองใหม่อีกครั้ง")}</button>
          <a href="/" className="ui-btn ui-btn-ghost">{tr("กลับหน้าร้าน")}</a>
        </div>
      </div>
    </main>
  );
}
