"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import { useState, useTransition } from "react";
import { submitReport } from "@/lib/actions/report-actions";
import { REPORT_CATEGORIES } from "@/lib/report-categories";

interface Props {
  reportedId: string;
  reportedName: string;
  /** Server-resolved so the button starts in the right state, no flicker */
  signedIn: boolean;
  isSelf: boolean;
  alreadyReported: boolean;
}

/**
 * Lets a shopper flag a seller.
 *
 * Nothing about a report is ever shown back to the person being reported —
 * not here, not in their notifications. Only admins read them.
 */
export default function ReportButton({
  reportedId, reportedName, signedIn, isSelf, alreadyReported,
}: Props) {
  const tr = useTr();
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState("");
  const [reason, setReason]     = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(alreadyReported);
  const [pending, startTransition] = useTransition();

  // You cannot report yourself, and there is nothing to offer a signed-out visitor
  if (isSelf) return null;

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--c-muted)] border border-[var(--c-line)] rounded-xl px-3 py-2">{tr("🚩 รายงานแล้ว — ทีมงานกำลังตรวจสอบ")}</span>
    );
  }

  function handleSubmit() {
    setError(null);
    if (!category) { setError(tr("กรุณาเลือกหัวข้อการรายงาน")); return; }
    if (reason.trim().length < 10) { setError(tr("กรุณาอธิบายเหตุผลอย่างน้อย 10 ตัวอักษร")); return; }

    startTransition(async () => {
      const res = await submitReport({ reportedId, category, reason });
      if (res.success) { setOpen(false); setDone(true); }
      else setError(tr(res.error));
    });
  }

  return (
    <>
      <button
        onClick={() => (signedIn ? setOpen(true) : setError(tr("กรุณาเข้าสู่ระบบก่อนรายงาน")))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--c-danger)] border border-[var(--c-danger-line)] bg-[var(--c-danger-soft)]/60 rounded-xl px-3 py-2 hover:bg-[var(--c-danger-soft)] transition"
      >{tr("🚩 รายงานผู้ใช้นี้")}</button>

      {!signedIn && error && (
        <p className="text-[11px] text-[var(--c-danger)] mt-1.5">{error}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={pending ? undefined : () => setOpen(false)} />

          <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[var(--c-ink)]">{tr("รายงาน {0}", [reportedName])}</h3>
              <p className="text-xs text-[var(--c-muted)] mt-1">{tr("เฉพาะผู้ดูแลระบบเท่านั้นที่เห็นรายงานนี้ ผู้ถูกรายงานจะไม่รู้ว่าใครเป็นคนรายงาน")}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-ink-1)] mb-1.5">{tr("หัวข้อ")}</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { setCategory(c.value); setError(null); }}
                    className={`text-[12px] px-3 py-2 rounded-xl border text-left transition ${
                      category === c.value
                        ? "border-[var(--c-danger)] bg-[var(--c-danger-soft)] text-[var(--c-danger)] font-semibold"
                        : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)]"
                    }`}
                  >
                    {tr(c.label)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-ink-1)] mb-1.5">{tr("รายละเอียด")}<span className="text-[var(--c-faint)]">{tr("({0}/10 ขั้นต่ำ)", [reason.trim().length])}</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value.slice(0, 2000)); setError(null); }}
                rows={4}
                placeholder={tr("เกิดอะไรขึ้น? ยิ่งละเอียดยิ่งตรวจสอบได้เร็ว")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-[var(--c-danger-line)] transition"
              />
            </div>

            {error && (
              <div role="alert" className="text-[13px] text-[var(--c-danger)] bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
              >{tr("ยกเลิก")}</button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-[var(--c-danger)] text-sm font-bold text-white hover:bg-[var(--c-danger)] transition disabled:opacity-50"
              >
                {pending ? tr("กำลังส่ง…") : tr("ส่งรายงาน")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
