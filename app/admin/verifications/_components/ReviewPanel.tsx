"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewVerification } from "@/app/profile/verify/actions";
import type { VerificationDetail } from "../actions";

const REJECTION_REASONS = [
  "รูปบัตรประจำตัวไม่ชัดเจน",
  "รหัสประจำตัวไม่ตรงกับบัตร",
  "รูปใบหน้าไม่ชัดหรือไม่ตรงกับบัตร",
  "ข้อมูลไม่ครบถ้วน",
  "บัตรหมดอายุหรือบัตรไม่ใช่ของ PSU",
  "ไม่ใช่นักศึกษา/บุคลากรของ PSU",
  "อื่นๆ",
];

interface Props {
  request: VerificationDetail;
}

export default function ReviewPanel({ request }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [decision, setDecision]           = useState<"APPROVED" | "REJECTED" | null>(null);
  const [rejectionReason, setRejection]   = useState("");
  const [customReason, setCustomReason]   = useState("");
  const [adminNote, setAdminNote]         = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const [done, setDone]                   = useState(false);

  if (request.status !== "PENDING") {
    return (
      <div className="bg-[var(--c-line-soft)] rounded-2xl p-5 text-sm text-[var(--c-muted)] text-center">{tr("คำขอนี้ถูกตรวจสอบแล้ว ({0})", [request.status])}</div>
    );
  }

  if (done) {
    return (
      <div className="bg-[var(--c-ok-soft)] border border-[var(--c-ok-line)] rounded-2xl p-6 text-center space-y-3">
        <p className="text-3xl">✅</p>
        <p className="font-semibold text-emerald-800">{tr("บันทึกผลเรียบร้อยแล้ว")}</p>
        <button
          onClick={() => router.push("/admin/verifications")}
          className="text-sm text-[var(--c-ok)] underline"
        >{tr("กลับรายการ")}</button>
      </div>
    );
  }

  const finalReason = rejectionReason === tr("อื่นๆ") ? customReason : rejectionReason;

  function handleSubmit() {
  const tr = useLocaleStore((s) => s.tr);
    if (!decision) return;
    if (decision === "REJECTED" && !finalReason.trim()) {
      setError(tr("กรุณาระบุเหตุผลการปฏิเสธ"));
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await reviewVerification({
        requestId: request.id,
        decision,
        rejectionReason: decision === "REJECTED" ? finalReason.trim() : undefined,
        adminNote: adminNote.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error ?? tr("เกิดข้อผิดพลาด"));
      } else {
        setDone(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-[var(--c-ink)]">{tr("ผลการตรวจสอบ")}</h3>

      {/* Decision buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setDecision("APPROVED")}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition ${
            decision === "APPROVED"
              ? "border-emerald-500 bg-[var(--c-ok-soft)] text-[var(--c-ok)]"
              : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-emerald-300"
          }`}
        >{tr("✅ อนุมัติ")}</button>
        <button
          onClick={() => { setDecision("REJECTED"); setRejection(""); }}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition ${
            decision === "REJECTED"
              ? "border-red-400 bg-[var(--c-danger-soft)] text-[var(--c-danger)]"
              : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-danger-line)]"
          }`}
        >{tr("❌ ปฏิเสธ")}</button>
      </div>

      {/* Rejection reasons */}
      {decision === "REJECTED" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--c-ink-1)]">{tr("เหตุผลการปฏิเสธ")}</label>
          <div className="space-y-2">
            {REJECTION_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={rejectionReason === r}
                  onChange={() => setRejection(r)}
                  className="accent-red-500"
                />
                <span className="text-sm text-[var(--c-ink-1)]">{tr(r)}</span>
              </label>
            ))}
          </div>
          {rejectionReason === tr("อื่นๆ") && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={tr("ระบุเหตุผล...")}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--c-line)] rounded-xl focus:outline-none focus:border-[var(--c-ink)] resize-none"
            />
          )}
        </div>
      )}

      {/* Admin note */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--c-ink-1)]">{tr("บันทึกแอดมิน (ไม่บังคับ)")}</label>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder={tr("บันทึกส่วนตัวสำหรับแอดมิน ผู้ใช้จะไม่เห็น...")}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-[var(--c-line)] rounded-xl focus:outline-none focus:border-[var(--c-ink)] resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-[var(--c-danger)] bg-[var(--c-danger-soft)] rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!decision || isPending}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-40 ${
          decision === "APPROVED"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : decision === "REJECTED"
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-[var(--c-ink)] text-white"
        }`}
      >
        {isPending ? tr("กำลังบันทึก…") : tr("บันทึกผล")}
      </button>
    </div>
  );
}
