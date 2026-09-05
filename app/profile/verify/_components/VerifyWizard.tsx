"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import FaceLivenessCapture, { type CapturedFrames } from "./FaceLivenessCapture";
import { submitVerification } from "../actions";
import { getIdValidationHint } from "@/lib/validations/kyc";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

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
              {i > 0 && <div className={`flex-1 h-0.5 ${done || active ? "bg-[var(--c-accent)]" : "bg-[var(--c-line)]"}`} />}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-all ${
                done   ? "bg-[var(--c-accent)] border-[var(--c-accent)] text-white" :
                active ? "bg-[var(--c-surface)] border-[var(--c-accent)] text-[var(--c-accent)]" :
                         "bg-[var(--c-surface)] border-[var(--c-line)] text-[var(--c-muted)]"
              }`}>
                {done ? "✓" : n}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 ${done ? "bg-[var(--c-accent)]" : "bg-[var(--c-line)]"}`} />}
            </div>
            <span className={`text-[10px] font-medium ${active ? "text-[var(--c-accent)]" : done ? "text-[var(--c-ink-2)]" : "text-[var(--c-muted)]"}`}>
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
  const tr = useLocaleStore((s) => s.tr);
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
        setErr(tr("รหัสนักศึกษาไม่ถูกต้อง (ต้องขึ้นต้นด้วย 56–{0})", [MAX_YEAR]));
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
        <h2 className="text-lg font-extrabold text-[var(--c-ink)]">{tr("ยืนยันตัวตนเพื่อเป็นผู้ขาย")}</h2>
        <p className="text-sm text-[var(--c-muted)]">{tr("เฉพาะนักศึกษาและบุคลากร PSU เท่านั้น")}</p>
      </div>

      {/* Type selector — buttons replace radio so they're always clickable */}
      <div>
        <p className="text-sm font-semibold text-[var(--c-ink-1)] mb-2">{tr("คุณเป็น")}<span className="text-[var(--c-danger)]">*</span></p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTypeSelect("STUDENT")}
            className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 text-sm font-semibold transition ${
              form.psuIdType === "STUDENT"
                ? "border-[var(--c-accent)] bg-[var(--c-warn-soft)] text-[var(--c-accent)]"
                : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-accent)]/50"
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
                ? "border-[var(--c-accent)] bg-[var(--c-warn-soft)] text-[var(--c-accent)]"
                : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-accent)]/50"
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
        <label className="block text-sm font-semibold text-[var(--c-ink-1)] mb-1.5">{tr("รหัสประจำตัว PSU")}<span className="text-[var(--c-danger)]">*</span>
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
          className="w-full border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition font-mono disabled:opacity-40 disabled:cursor-not-allowed"
        />

        {/* Inline validation hint */}
        {form.psuIdNumber && (
          <p className={`text-xs mt-1.5 ${
            hint.status === "valid"  ? "text-[var(--c-ok)]" :
            hint.status === "error"  ? "text-[var(--c-danger)]"     :
            hint.status === "typing" ? "text-[var(--c-muted)]"   : "hidden"
          }`}>
            {hint.message}
          </p>
        )}

        {err && <p className="text-xs text-[var(--c-danger)] mt-1">{err}</p>}
      </div>

      {/* Faculty */}
      <div>
        <label className="block text-sm font-semibold text-[var(--c-ink-1)] mb-1.5">{tr("คณะ / หน่วยงาน")}<span className="text-[var(--c-muted)] font-normal">{tr("(ไม่บังคับ)")}</span>
        </label>
        <input
          type="text"
          value={form.facultyOrDepartment}
          onChange={(e) => onChange({ facultyOrDepartment: e.target.value })}
          placeholder="เช่น คณะวิศวกรรมศาสตร์"
          className="w-full border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
        />
      </div>

      <button
        onClick={() => { if (validate()) onNext(); }}
        className="w-full py-3 rounded-xl bg-[var(--c-accent)] text-white font-bold text-sm hover:bg-[var(--c-accent-str)] transition"
      >{tr("ถัดไป →")}</button>
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
  const tr = useLocaleStore((s) => s.tr);
  const fileRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErr("กรุณาเลือกไฟล์รูปภาพ"); return; }

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
      const { file: prepared } = await prepareImageForUpload(file);
      const fd = new FormData();
      fd.append("file", prepared);
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
        <h2 className="text-lg font-extrabold text-[var(--c-ink)]">{tr("อัปโหลดรูปบัตรประจำตัว")}</h2>
        <p className="text-sm text-[var(--c-muted)]">{tr("ถ่ายรูปหน้าบัตร PSU ให้เห็นชื่อและรหัสชัดเจน")}</p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
          uploading
            ? "border-[var(--c-line)] cursor-not-allowed opacity-60"
            : "border-[var(--c-line)] cursor-pointer hover:border-[var(--c-accent)]/50 hover:bg-[var(--c-warn-soft)]/30"
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
              <p className="text-xs text-[var(--c-ok)] font-medium">{tr("✓ อัปโหลดเรียบร้อยแล้ว")}</p>
            )}
            {uploading && (
              <p className="text-xs text-[var(--c-muted)] animate-pulse">{tr("⏳ กำลังอัปโหลด…")}</p>
            )}
            {!uploading && (
              <p className="text-xs text-[var(--c-muted)]">{tr("คลิกเพื่อเปลี่ยนรูป")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-[var(--c-muted)]">
            <div className="text-4xl">🪪</div>
            <p className="text-sm font-semibold">{tr("คลิกเพื่อเลือกรูป หรือลากไฟล์มาวางที่นี่")}</p>
            <p className="text-xs">{tr("รูปภาพทุกชนิด ทุกขนาด • ระบบย่อขนาดให้อัตโนมัติ")}</p>
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

      {err && <p className="text-xs text-[var(--c-danger)] text-center">{err}</p>}

      <div className="bg-[var(--c-accent-soft)] border border-blue-100 rounded-xl px-4 py-3 text-xs text-[var(--c-accent-str)] space-y-1">
        <p className="font-semibold">💡 เคล็ดลับ:</p>
        <p>• ถ่ายในที่สว่าง ไม่มีเงาทับ</p>
        <p>• ให้เห็นชื่อ-นามสกุล และรหัสชัดเจน</p>
        <p>• ไม่ต้องถือบัตรคู่กับหน้า (ทำในขั้นตอนถัดไป)</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
        >{tr("← ย้อนกลับ")}</button>
        <button
          onClick={() => {
            if (!form.idCardImageUrl) { setErr("กรุณาอัปโหลดรูปบัตรก่อน"); return; }
            onNext();
          }}
          disabled={uploading}
          className="flex-1 py-3 rounded-xl bg-[var(--c-accent)] text-white font-bold text-sm hover:bg-[var(--c-accent-str)] transition disabled:opacity-40"
        >
          {uploading ? tr("กำลังอัปโหลด…") : tr("ถัดไป →")}
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
  const tr = useLocaleStore((s) => s.tr);
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
        <h2 className="text-lg font-extrabold text-[var(--c-ink)]">ยืนยันใบหน้า</h2>
        <p className="text-sm text-[var(--c-muted)]">ถ่ายภาพ 4 มุมเพื่อยืนยันว่าเป็นตัวคุณเอง</p>
      </div>

      <FaceLivenessCapture onComplete={handleComplete} />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
        >{tr("← ย้อนกลับ")}</button>
        <button
          onClick={onNext}
          disabled={!done}
          className="flex-1 py-3 rounded-xl bg-[var(--c-accent)] text-white font-bold text-sm hover:bg-[var(--c-accent-str)] transition disabled:opacity-40"
        >{tr("ถัดไป →")}</button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────

function ReviewStep({ form, onBack }: { form: FormState; onBack: () => void }) {
  const tr = useLocaleStore((s) => s.tr);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Guard: check all required fields before hitting the server
  const missingIdCard  = !form.idCardImageUrl;
  const missingSelfie  = !form.frames.front;
  const canSubmit      = !missingIdCard && !missingSelfie;

  async function handleSubmit() {
  const tr = useLocaleStore((s) => s.tr);
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
      setError(res.error ?? tr("เกิดข้อผิดพลาด"));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">📋</div>
        <h2 className="text-lg font-extrabold text-[var(--c-ink)]">ตรวจสอบก่อนส่ง</h2>
      </div>

      {/* Summary */}
      <div className="bg-[var(--c-canvas)] rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--c-muted)]">{tr("ประเภท")}</span>
          <span className="font-semibold">
            {form.psuIdType === "STUDENT" ? "นักศึกษา" : form.psuIdType === "STAFF" ? "บุคลากร" : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--c-muted)]">{tr("รหัส PSU")}</span>
          <span className="font-mono font-semibold">{form.psuIdNumber || "—"}</span>
        </div>
        {form.facultyOrDepartment && (
          <div className="flex justify-between">
            <span className="text-[var(--c-muted)]">{tr("คณะ/หน่วยงาน")}</span>
            <span className="font-semibold">{form.facultyOrDepartment}</span>
          </div>
        )}
      </div>

      {/* ID Card thumb */}
      {form.idCardImagePreview ? (
        <div>
          <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("รูปบัตรประจำตัว")}</p>
          <img
            src={form.idCardImagePreview}
            alt="ID"
            className="h-28 w-full object-contain rounded-xl border border-[var(--c-line)] bg-[var(--c-canvas)]"
          />
        </div>
      ) : (
        missingIdCard && (
          <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-3 text-xs text-[var(--c-danger)]">{tr("⚠️ ไม่พบรูปบัตรประจำตัว — กรุณากลับไปอัปโหลดอีกครั้ง")}</div>
        )
      )}

      {/* Selfie thumbs */}
      <div>
        <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("รูปยืนยันตัวตน")}</p>
        {missingSelfie ? (
          <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-3 text-xs text-[var(--c-danger)]">{tr("⚠️ ไม่พบรูปยืนยันตัวตน — กรุณากลับไปถ่ายรูปอีกครั้ง")}</div>
        ) : (
          <div className="flex gap-2">
            {(["front","left","right","up"] as const).map((k) => (
              <div
                key={k}
                className={`flex-1 aspect-square rounded-xl overflow-hidden border ${
                  form.frames[k] ? "border-emerald-300" : "border-[var(--c-line)] bg-[var(--c-canvas)]"
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

      <div className="bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-4 py-3 text-xs text-[var(--c-warn)]">{tr("⚠️ เมื่อส่งแล้ว ทีมงานจะตรวจสอบภายใน 24 ชม. คุณจะได้รับแจ้งเตือนเมื่อมีผลการตรวจสอบ")}</div>

      {error && (
        <p className="text-sm text-[var(--c-danger)] text-center bg-[var(--c-danger-soft)] rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-40"
        >{tr("← ย้อนกลับ")}</button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="flex-1 py-3 rounded-xl bg-[var(--c-accent)] text-white font-bold text-sm hover:bg-[var(--c-accent-str)] transition disabled:opacity-40 flex items-center justify-center gap-2"
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
