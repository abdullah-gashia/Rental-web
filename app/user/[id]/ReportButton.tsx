"use client";

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
      <span className="inline-flex items-center gap-1.5 text-xs text-[#64748b] border border-[#dfe7f2] rounded-xl px-3 py-2">
        🚩 รายงานแล้ว — ทีมงานกำลังตรวจสอบ
      </span>
    );
  }

  function handleSubmit() {
    setError(null);
    if (!category) { setError("กรุณาเลือกหัวข้อการรายงาน"); return; }
    if (reason.trim().length < 10) { setError("กรุณาอธิบายเหตุผลอย่างน้อย 10 ตัวอักษร"); return; }

    startTransition(async () => {
      const res = await submitReport({ reportedId, category, reason });
      if (res.success) { setOpen(false); setDone(true); }
      else setError(res.error);
    });
  }

  return (
    <>
      <button
        onClick={() => (signedIn ? setOpen(true) : setError("กรุณาเข้าสู่ระบบก่อนรายงาน"))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b3261e] border border-red-200 bg-red-50/60 rounded-xl px-3 py-2 hover:bg-red-50 transition"
      >
        🚩 รายงานผู้ใช้นี้
      </button>

      {!signedIn && error && (
        <p className="text-[11px] text-red-600 mt-1.5">{error}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={pending ? undefined : () => setOpen(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0f1e35]">รายงาน {reportedName}</h3>
              <p className="text-xs text-[#64748b] mt-1">
                เฉพาะผู้ดูแลระบบเท่านั้นที่เห็นรายงานนี้ ผู้ถูกรายงานจะไม่รู้ว่าใครเป็นคนรายงาน
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1e2d47] mb-1.5">หัวข้อ</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { setCategory(c.value); setError(null); }}
                    className={`text-[12px] px-3 py-2 rounded-xl border text-left transition ${
                      category === c.value
                        ? "border-[#b3261e] bg-red-50 text-[#b3261e] font-semibold"
                        : "border-[#dfe7f2] text-[#3d4d66] hover:bg-[#f1f5fb]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1e2d47] mb-1.5">
                รายละเอียด <span className="text-[#94a3b8]">({reason.trim().length}/10 ขั้นต่ำ)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value.slice(0, 2000)); setError(null); }}
                rows={4}
                placeholder="เกิดอะไรขึ้น? ยิ่งละเอียดยิ่งตรวจสอบได้เร็ว"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dfe7f2] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition"
              />
            </div>

            {error && (
              <div role="alert" className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl border border-[#dfe7f2] text-sm font-semibold text-[#3d4d66] hover:bg-[#f1f5fb] transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-[#b3261e] text-sm font-bold text-white hover:bg-[#8f1d17] transition disabled:opacity-50"
              >
                {pending ? "กำลังส่ง…" : "ส่งรายงาน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
