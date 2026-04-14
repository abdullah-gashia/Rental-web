"use client";

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
      <div className="bg-[#f0ede7] rounded-2xl p-5 text-sm text-[#9a9590] text-center">
        คำขอนี้ถูกตรวจสอบแล้ว ({request.status})
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
        <p className="text-3xl">✅</p>
        <p className="font-semibold text-emerald-800">บันทึกผลเรียบร้อยแล้ว</p>
        <button
          onClick={() => router.push("/admin/verifications")}
          className="text-sm text-emerald-700 underline"
        >
          กลับรายการ
        </button>
      </div>
    );
  }

  const finalReason = rejectionReason === "อื่นๆ" ? customReason : rejectionReason;

  function handleSubmit() {
    if (!decision) return;
    if (decision === "REJECTED" && !finalReason.trim()) {
      setError("กรุณาระบุเหตุผลการปฏิเสธ");
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
        setError(result.error ?? "เกิดข้อผิดพลาด");
      } else {
        setDone(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-[#111]">ผลการตรวจสอบ</h3>

      {/* Decision buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setDecision("APPROVED")}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition ${
            decision === "APPROVED"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-[#e5e3de] text-[#555] hover:border-emerald-300"
          }`}
        >
          ✅ อนุมัติ
        </button>
        <button
          onClick={() => { setDecision("REJECTED"); setRejection(""); }}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition ${
            decision === "REJECTED"
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-[#e5e3de] text-[#555] hover:border-red-300"
          }`}
        >
          ❌ ปฏิเสธ
        </button>
      </div>

      {/* Rejection reasons */}
      {decision === "REJECTED" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#333]">เหตุผลการปฏิเสธ</label>
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
                <span className="text-sm text-[#333]">{r}</span>
              </label>
            ))}
          </div>
          {rejectionReason === "อื่นๆ" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="ระบุเหตุผล..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl focus:outline-none focus:border-[#111] resize-none"
            />
          )}
        </div>
      )}

      {/* Admin note */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#333]">บันทึกแอดมิน (ไม่บังคับ)</label>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="บันทึกส่วนตัวสำหรับแอดมิน ผู้ใช้จะไม่เห็น..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl focus:outline-none focus:border-[#111] resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
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
            : "bg-[#111] text-white"
        }`}
      >
        {isPending ? "กำลังบันทึก…" : "บันทึกผล"}
      </button>
    </div>
  );
}
