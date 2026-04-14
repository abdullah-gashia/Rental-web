"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import FaceLivenessCapture, { type CapturedFrames } from "./FaceLivenessCapture";
import { submitVerification } from "../actions";
import { getIdValidationHint } from "@/lib/validations/kyc";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

type FormState = {
  psuIdType:            "STUDENT" | "STAFF" | null;
  psuIdNumber:          string;
  facultyOrDepartment:  string;
  idCardImageUrl:       string;   // empty string = not yet uploaded
  idCardImagePreview:   string;   // local preview (blob or data URL)
  frames:               CapturedFrames;
};

const INITIAL: FormState = {
  psuIdType:            null,
  psuIdNumber:          "",
  facultyOrDepartment:  "",
  idCardImageUrl:       "",
  idCardImagePreview:   "",
  frames:               { front: null, left: null, right: null, up: null },
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const labels = ["ข้อมูล PSU ID", "อัปโหลดบัตร", "ยืนยันใบหน้า", "ตรวจสอบ & ส่ง"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((label, i) => {
        const n      = (i + 1) as Step;
        const done   = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-0.5 ${done || active ? "bg-[#e8500a]" : "bg-[#e5e3de]"}`} />}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-all ${
                done   ? "bg-[#e8500a] border-[#e8500a] text-white" :
                active ? "bg-white border-[#e8500a] text-[#e8500a]" :
                         "bg-white border-[#e5e3de] text-[#9a9590]"
              }`}>
                {done ? "✓" : n}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 ${done ? "bg-[#e8500a]" : "bg-[#e5e3de]"}`} />}
            </div>
            <span className={`text-[10px] font-medium ${active ? "text-[#e8500a]" : done ? "text-[#555]" : "text-[#9a9590]"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: PSU ID ───────────────────────────────────────────────────────────

function PsuIdStep({ form, onChange, onNext }: {
  form:     FormState;
  onChange: (patch: Partial<FormState>) => void;
  onNext:   () => void;
}) {
  const [err,              setErr]              = useState("");
  const [explicitlyChosen, setExplicitlyChosen] = useState(false);

  // User explicitly picks a type — lock it in, don't auto-override
  function handleTypeSelect(type: "STUDENT" | "STAFF") {
    onChange({ psuIdType: type, psuIdNumber: "" });
    setExplicitlyChosen(true);
    setErr("");
  }

  // Only strip non-digits; do NOT auto-switch type on every keystroke
  function handleIdChange(val: string) {
    const maxLen = form.psuIdType === "STAFF" ? 5 : 10;
    const digits = val.replace(/\D/g, "").slice(0, maxLen);
    onChange({ psuIdNumber: digits });
    setErr("");
  }

  // Auto-suggest type on blur ONLY when user hasn't picked one yet
  function handleIdBlur() {
    if (explicitlyChosen) return;
    const d = form.psuIdNumber;
    if (d.length === 5) {
      onChange({ psuIdType: "STAFF" });
    } else if (d.length === 10) {
      onChange({ psuIdType: "STUDENT" });
    }
  }

  function validate(): boolean {
    if (!form.psuIdType) { setErr("กรุณาเลือกประเภท (นักศึกษา / บุคลากร)"); return false; }
    const n = form.psuIdNumber;
    if (!n) { setErr("กรุณากรอกรหัสประจำตัว"); return false; }
    if (form.psuIdType === "STAFF"   && n.length !== 5)  { setErr("รหัสบุคลากรต้องมี 5 หลัก");   return false; }
    if (form.psuIdType === "STUDENT" && n.length !== 10) { setErr("รหัสนักศึกษาต้องมี 10 หลัก"); return false; }

    // Strict year prefix check for students
    if (form.psuIdType === "STUDENT") {
      const CURRENT_YEAR_BE  = new Date().getFullYear() + 543;
      const MAX_YEAR         = CURRENT_YEAR_BE % 100;
      const yearPrefix       = parseInt(n.substring(0, 2), 10);
      if (yearPrefix < 56 || yearPrefix > MAX_YEAR) {
        setErr(`รหัสนักศึกษาไม่ถูกต้อง (ต้องขึ้นต้นด้วย 56–${MAX_YEAR})`);
        return false;
      }
    }

    return true;
  }

  const hint = getIdValidationHint(form.psuIdNumber, form.psuIdType);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">🎓</div>
        <h2 className="text-lg font-extrabold text-[#111]">ยืนยันตัวตนเพื่อเป็นผู้ขาย</h2>
        <p className="text-sm text-[#9a9590]">เฉพาะนักศึกษาและบุคลากร PSU เท่านั้น</p>
      </div>

      {/* Type selector — buttons replace radio so they're always clickable */}
      <div>
        <p className="text-sm font-semibold text-[#333] mb-2">คุณเป็น <span className="text-red-500">*</span></p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTypeSelect("STUDENT")}
            className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 text-sm font-semibold transition ${
              form.psuIdType === "STUDENT"
                ? "border-[#e8500a] bg-orange-50 text-[#e8500a]"
                : "border-[#e5e3de] text-[#555] hover:border-[#e8500a]/50"
            }`}
          >
            <span className="text-2xl">🎓</span>
            <span>นักศึกษา</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect("STAFF")}
            className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 text-sm font-semibold transition ${
              form.psuIdType === "STAFF"
                ? "border-[#e8500a] bg-orange-50 text-[#e8500a]"
                : "border-[#e5e3de] text-[#555] hover:border-[#e8500a]/50"
            }`}
          >
            <span className="text-2xl">👨‍💼</span>
            <span>บุคลากร</span>
          </button>
        </div>

        {/* Auto-detect hint (shown only when system guessed, not when user chose) */}
        {!explicitlyChosen && form.psuIdType && (
          <p className="text-xs text-blue-500 mt-1.5">
            ✨ ระบบตรวจพบว่าเป็นรหัส{form.psuIdType === "STUDENT" ? "นักศึกษา" : "บุคลากร"} (สามารถเปลี่ยนได้)
          </p>
        )}
      </div>

      {/* ID input */}
      <div>
        <label className="block text-sm font-semibold text-[#333] mb-1.5">
          รหัสประจำตัว PSU <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={form.psuIdType === "STAFF" ? 5 : 10}
          value={form.psuIdNumber}
          onChange={(e) => handleIdChange(e.target.value)}
          onBlur={handleIdBlur}
          placeholder={
            form.psuIdType === "STUDENT" ? "เช่น 6610110001" :
            form.psuIdType === "STAFF"   ? "เช่น 50001" :
            "เลือกประเภทก่อน"
          }
          disabled={!form.psuIdType}
          className="w-full border border-[#e5e3de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition font-mono disabled:opacity-40 disabled:cursor-not-allowed"
        />

        {/* Inline validation hint */}
        {form.psuIdNumber && (
          <p className={`text-xs mt-1.5 ${
            hint.status === "valid"  ? "text-emerald-600" :
            hint.status === "error"  ? "text-red-500"     :
            hint.status === "typing" ? "text-[#9a9590]"   : "hidden"
          }`}>
            {hint.message}
          </p>
        )}

        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>

      {/* Faculty */}
      <div>
        <label className="block text-sm font-semibold text-[#333] mb-1.5">
          คณะ / หน่วยงาน <span className="text-[#9a9590] font-normal">(ไม่บังคับ)</span>
        </label>
        <input
          type="text"
          value={form.facultyOrDepartment}
          onChange={(e) => onChange({ facultyOrDepartment: e.target.value })}
          placeholder="เช่น คณะวิศวกรรมศาสตร์"
          className="w-full border border-[#e5e3de] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
        />
      </div>

      <button
        onClick={() => { if (validate()) onNext(); }}
        className="w-full py-3 rounded-xl bg-[#e8500a] text-white font-bold text-sm hover:bg-[#c94208] transition"
      >
        ถัดไป →
      </button>
    </div>
  );
}

// ─── Step 2: ID Card Upload ───────────────────────────────────────────────────

function IdCardUploadStep({ form, onChange, onNext, onBack }: {
  form:     FormState;
  onChange: (patch: Partial<FormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErr("กรุณาเลือกไฟล์รูปภาพ"); return; }
    if (file.size > 5 * 1024 * 1024)    { setErr("ไฟล์ต้องมีขนาดไม่เกิน 5 MB"); return; }

    setUploading(true);
    setErr("");

    // Show preview immediately from FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange({ idCardImagePreview: e.target.result as string });
      }
    };
    reader.readAsDataURL(file);

    // Upload to server and save the returned URL in parent state
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "kyc");

      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok && data.url) {
        onChange({ idCardImageUrl: data.url });
      } else {
        setErr(data.error ?? "อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
        onChange({ idCardImageUrl: "", idCardImagePreview: "" });
      }
    } catch {
      setErr("เกิดข้อผิดพลาดในการอัปโหลด");
      onChange({ idCardImageUrl: "", idCardImagePreview: "" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">📸</div>
        <h2 className="text-lg font-extrabold text-[#111]">อัปโหลดรูปบัตรประจำตัว</h2>
        <p className="text-sm text-[#9a9590]">ถ่ายรูปหน้าบัตร PSU ให้เห็นชื่อและรหัสชัดเจน</p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
          uploading
            ? "border-[#e5e3de] cursor-not-allowed opacity-60"
            : "border-[#e5e3de] cursor-pointer hover:border-[#e8500a]/50 hover:bg-orange-50/30"
        }`}
      >
        {form.idCardImagePreview ? (
          <div className="space-y-2">
            <img
              src={form.idCardImagePreview}
              alt="ID Card"
              className="max-h-48 mx-auto rounded-xl object-contain"
            />
            {form.idCardImageUrl && (
              <p className="text-xs text-emerald-600 font-medium">✓ อัปโหลดเรียบร้อยแล้ว</p>
            )}
            {uploading && (
              <p className="text-xs text-[#9a9590] animate-pulse">⏳ กำลังอัปโหลด…</p>
            )}
            {!uploading && (
              <p className="text-xs text-[#9a9590]">คลิกเพื่อเปลี่ยนรูป</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-[#9a9590]">
            <div className="text-4xl">🪪</div>
            <p className="text-sm font-semibold">คลิกเพื่อเลือกรูป หรือลากไฟล์มาวางที่นี่</p>
            <p className="text-xs">JPG, PNG, WEBP • ไม่เกิน 5 MB</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </div>

      {err && <p className="text-xs text-red-600 text-center">{err}</p>}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">💡 เคล็ดลับ:</p>
        <p>• ถ่ายในที่สว่าง ไม่มีเงาทับ</p>
        <p>• ให้เห็นชื่อ-นามสกุล และรหัสชัดเจน</p>
        <p>• ไม่ต้องถือบัตรคู่กับหน้า (ทำในขั้นตอนถัดไป)</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
        >
          ← ย้อนกลับ
        </button>
        <button
          onClick={() => {
            if (!form.idCardImageUrl) { setErr("กรุณาอัปโหลดรูปบัตรก่อน"); return; }
            onNext();
          }}
          disabled={uploading}
          className="flex-1 py-3 rounded-xl bg-[#e8500a] text-white font-bold text-sm hover:bg-[#c94208] transition disabled:opacity-40"
        >
          {uploading ? "กำลังอัปโหลด…" : "ถัดไป →"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Face Liveness ────────────────────────────────────────────────────

function FaceLivenessStep({ form, onChange, onNext, onBack }: {
  form:     FormState;
  onChange: (patch: Partial<FormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}) {
  // If frames were already captured in a previous visit, start as done
  const alreadyDone = !!form.frames.front;
  const [done, setDone] = useState(alreadyDone);

  function handleComplete(frames: CapturedFrames) {
    onChange({ frames });
    setDone(true);
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">🤳</div>
        <h2 className="text-lg font-extrabold text-[#111]">ยืนยันใบหน้า</h2>
        <p className="text-sm text-[#9a9590]">ถ่ายภาพ 4 มุมเพื่อยืนยันว่าเป็นตัวคุณเอง</p>
      </div>

      <FaceLivenessCapture onComplete={handleComplete} />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
        >
          ← ย้อนกลับ
        </button>
        <button
          onClick={onNext}
          disabled={!done}
          className="flex-1 py-3 rounded-xl bg-[#e8500a] text-white font-bold text-sm hover:bg-[#c94208] transition disabled:opacity-40"
        >
          ถัดไป →
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────

function ReviewStep({ form, onBack }: { form: FormState; onBack: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Guard: check all required fields before hitting the server
  const missingIdCard  = !form.idCardImageUrl;
  const missingSelfie  = !form.frames.front;
  const canSubmit      = !missingIdCard && !missingSelfie;

  async function handleSubmit() {
    if (!canSubmit) {
      setError("ข้อมูลไม่ครบ กรุณากลับไปตรวจสอบ");
      return;
    }
    if (!form.psuIdType) {
      setError("กรุณากลับไปเลือกประเภทใน ขั้นตอน 1");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await submitVerification({
      psuIdNumber:         form.psuIdNumber,
      psuIdType:           form.psuIdType,
      facultyOrDepartment: form.facultyOrDepartment || undefined,
      idCardImageUrl:      form.idCardImageUrl,
      selfieFrontUrl:      form.frames.front!,
      selfieLeftUrl:       form.frames.left   ?? undefined,
      selfieRightUrl:      form.frames.right  ?? undefined,
      selfieUpUrl:         form.frames.up     ?? undefined,
    });

    if (res.success) {
      router.push("/profile/verify?submitted=1");
    } else {
      setError(res.error ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">📋</div>
        <h2 className="text-lg font-extrabold text-[#111]">ตรวจสอบก่อนส่ง</h2>
      </div>

      {/* Summary */}
      <div className="bg-[#f7f6f3] rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#9a9590]">ประเภท</span>
          <span className="font-semibold">
            {form.psuIdType === "STUDENT" ? "นักศึกษา" : form.psuIdType === "STAFF" ? "บุคลากร" : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#9a9590]">รหัส PSU</span>
          <span className="font-mono font-semibold">{form.psuIdNumber || "—"}</span>
        </div>
        {form.facultyOrDepartment && (
          <div className="flex justify-between">
            <span className="text-[#9a9590]">คณะ/หน่วยงาน</span>
            <span className="font-semibold">{form.facultyOrDepartment}</span>
          </div>
        )}
      </div>

      {/* ID Card thumb */}
      {form.idCardImagePreview ? (
        <div>
          <p className="text-xs font-semibold text-[#555] mb-1.5">รูปบัตรประจำตัว</p>
          <img
            src={form.idCardImagePreview}
            alt="ID"
            className="h-28 w-full object-contain rounded-xl border border-[#e5e3de] bg-[#f7f6f3]"
          />
        </div>
      ) : (
        missingIdCard && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
            ⚠️ ไม่พบรูปบัตรประจำตัว — กรุณากลับไปอัปโหลดอีกครั้ง
          </div>
        )
      )}

      {/* Selfie thumbs */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-1.5">รูปยืนยันตัวตน</p>
        {missingSelfie ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
            ⚠️ ไม่พบรูปยืนยันตัวตน — กรุณากลับไปถ่ายรูปอีกครั้ง
          </div>
        ) : (
          <div className="flex gap-2">
            {(["front","left","right","up"] as const).map((k) => (
              <div
                key={k}
                className={`flex-1 aspect-square rounded-xl overflow-hidden border ${
                  form.frames[k] ? "border-emerald-300" : "border-[#e5e3de] bg-[#f7f6f3]"
                }`}
              >
                {form.frames[k] && (
                  <img src={form.frames[k]!} alt={k} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        ⚠️ เมื่อส่งแล้ว ทีมงานจะตรวจสอบภายใน 24 ชม. คุณจะได้รับแจ้งเตือนเมื่อมีผลการตรวจสอบ
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-40"
        >
          ← ย้อนกลับ
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="flex-1 py-3 rounded-xl bg-[#e8500a] text-white font-bold text-sm hover:bg-[#c94208] transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {submitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {submitting ? "กำลังส่ง…" : "📤 ส่งเพื่อตรวจสอบ"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function VerifyWizard() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL);

  function patch(p: Partial<FormState>) { setForm((f) => ({ ...f, ...p })); }

  return (
    <div className="max-w-lg mx-auto">
      <StepBar current={step} />
      {step === 1 && <PsuIdStep        form={form} onChange={patch} onNext={() => setStep(2)} />}
      {step === 2 && <IdCardUploadStep form={form} onChange={patch} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <FaceLivenessStep form={form} onChange={patch} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <ReviewStep       form={form} onBack={() => setStep(3)} />}
    </div>
  );
}
