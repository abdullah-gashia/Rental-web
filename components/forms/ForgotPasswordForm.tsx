"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTr } from "@/lib/i18n/LocaleProvider";
import {
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
} from "@/lib/actions/password-reset";

type Step = "email" | "code" | "password" | "done";

/**
 * Setting a new password when you cannot remember the old one.
 *
 * Three steps in one panel rather than three pages: the address, the code that
 * was mailed to it, then the new password. Staying in one place means the
 * address typed at the start is still on screen when the code arrives, which
 * is when people usually want to check they typed it right.
 *
 * The code is checked once before asking for a new password — being told
 * "wrong code" after thinking one up is a poor way to find out — and again
 * when the password is submitted, so nothing rests on the first check.
 */
export default function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const tr = useTr();
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();

  // Seconds until another code may be asked for.
  const [cooldown, setCooldown] = useState(0);
  const codeInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(""); setNotice("");
    start(async () => {
      const res = await requestPasswordReset(email);
      if (!res.success) { setError(tr(res.error, res.params)); return; }
      setNotice(tr(res.message, res.params));
      setCooldown(60);
      setStep("code");
    });
  }

  function checkCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await verifyResetCode(email, code);
      if (!res.success) { setError(tr(res.error, res.params)); return; }
      setNotice("");
      setStep("password");
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(tr("รหัสผ่านใหม่และการยืนยันยังไม่ตรงกัน"));
      return;
    }
    start(async () => {
      const res = await resetPassword(email, code, password);
      if (!res.success) { setError(tr(res.error, res.params)); return; }
      setNotice(tr(res.message, res.params));
      setStep("done");
    });
  }

  const field = "w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm bg-[var(--c-surface)] text-[var(--c-ink)]";
  const primary = "w-full bg-[var(--c-ink)] text-white font-semibold py-3 rounded-xl hover:bg-[var(--c-ink-1)] transition disabled:opacity-50";

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {tr("กลับไปหน้าเข้าสู่ระบบ")}
      </button>

      <h2 className="text-lg font-bold text-[var(--c-ink)] mb-1">{tr("ลืมรหัสผ่าน")}</h2>
      <p className="text-sm text-[var(--c-ink-3)] mb-5">
        {step === "email"    && tr("กรอกอีเมลของคุณ ระบบจะส่งรหัสยืนยัน 6 หลักไปให้")}
        {step === "code"     && tr("กรอกรหัส 6 หลักที่ส่งไปทางอีเมล")}
        {step === "password" && tr("ตั้งรหัสผ่านใหม่ของคุณ")}
        {step === "done"     && tr("เสร็จเรียบร้อย")}
      </p>

      {error && (
        <div className="mb-3 p-3 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl text-sm text-[var(--c-danger)]">
          ⚠️ {error}
        </div>
      )}
      {notice && !error && (
        <div className="mb-3 p-3 bg-[var(--c-ok-soft)] border border-[var(--c-ok-line)] rounded-xl text-sm text-[var(--c-ok)]">
          {notice}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={send} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr("อีเมลที่ใช้สมัคร")}
            className={field}
            required
            autoFocus
          />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? tr("กำลังส่ง...") : tr("ส่งรหัสยืนยัน")}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={checkCode} className="flex flex-col gap-3">
          <p className="text-xs text-[var(--c-muted)] -mt-1">{tr("ส่งไปที่ {0}", [email])}</p>
          <input
            ref={codeInput}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className={`${field} text-center text-2xl tracking-[0.4em] font-mono`}
            required
          />
          <button type="submit" disabled={pending || code.length !== 6} className={primary}>
            {pending ? tr("กำลังตรวจสอบ...") : tr("ยืนยันรหัส")}
          </button>
          <button
            type="button"
            onClick={() => send()}
            disabled={pending || cooldown > 0}
            className="text-sm text-[var(--c-accent)] hover:underline disabled:text-[var(--c-faint)] disabled:no-underline"
          >
            {cooldown > 0 ? tr("ขอรหัสใหม่ได้ในอีก {0} วินาที", [cooldown]) : tr("ส่งรหัสอีกครั้ง")}
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={save} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tr("รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)")}
            className={field}
            minLength={8}
            required
            autoFocus
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={tr("ยืนยันรหัสผ่านใหม่")}
            className={field}
            minLength={8}
            required
          />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? tr("กำลังบันทึก…") : tr("ตั้งรหัสผ่านใหม่")}
          </button>
        </form>
      )}

      {step === "done" && (
        <button type="button" onClick={onBack} className={primary}>
          {tr("เข้าสู่ระบบ")}
        </button>
      )}
    </div>
  );
}
