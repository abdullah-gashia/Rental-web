"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import {
  AUDIENCE_HINT, AUDIENCE_LABEL, AUDIENCE_VALUES, type Audience,
} from "@/lib/broadcast-audiences";
import { sendBroadcast, type AudienceCount, type BroadcastResult } from "./actions";

interface Props {
  counts:     AudienceCount[];
  adminEmail: string;
  mailReady:  boolean;
}

export default function BroadcastForm({ counts, adminEmail, mailReady }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [audience, setAudience]   = useState<Audience>("ALL");
  const [subject,  setSubject]    = useState("");
  const [body,     setBody]       = useState("");
  const [respect,  setRespect]    = useState(true);
  const [inApp,    setInApp]      = useState(true);
  const [confirm,  setConfirm]    = useState(false);
  const [testTo,   setTestTo]     = useState(adminEmail.includes("@") ? adminEmail : "");
  const [result,   setResult]     = useState<BroadcastResult | null>(null);
  const [pending, startTransition] = useTransition();

  const selected  = counts.find((c) => c.audience === audience);
  const reachable = respect ? (selected?.reachable ?? 0) : (selected?.total ?? 0);
  const canSend   = mailReady && subject.trim() && body.trim();

  function run(testOnly: boolean) {
    setResult(null);
    startTransition(async () => {
      const res = await sendBroadcast({
        audience,
        subject,
        body,
        respectPreference: respect,
        alsoNotifyInApp:   inApp,
        testOnly,
        testEmail:         testOnly ? testTo : undefined,
      });
      setResult(res);
      setConfirm(false);
    });
  }

  return (
    <div className="space-y-5">
      {!mailReady && (
        <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-2xl px-4 py-3 text-sm text-[var(--c-danger)]">{tr("ยังส่งอีเมลไม่ได้ — ตั้งค่า")}<code className="font-mono text-xs">GMAIL_USER</code> และ{" "}
          <code className="font-mono text-xs">GMAIL_APP_PASSWORD</code>{tr("ก่อน")}</div>
      )}

      {/* ── Audience ─────────────────────────────────────────────────────── */}
      <section className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <h2 className="text-sm font-bold text-[var(--c-ink-1)] mb-1">{tr("1 · เลือกกลุ่มผู้รับ")}</h2>
        <p className="text-xs text-[var(--c-muted)] mb-4">{tr("ไม่รวมบัญชีที่ถูกแบนและบัญชีผู้ดูแลระบบ")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUDIENCE_VALUES.map((a) => {
            const c = counts.find((x) => x.audience === a);
            const n = respect ? (c?.reachable ?? 0) : (c?.total ?? 0);
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={`text-left rounded-xl border px-4 py-3 transition ${
                  audience === a
                    ? "border-[var(--c-accent)] bg-[var(--c-accent)]/5 ring-1 ring-[var(--c-accent)]/25"
                    : "border-[var(--c-line)] hover:border-[var(--c-line-str)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--c-ink)]">{tr(AUDIENCE_LABEL[a])}</span>
                  <span className={`text-sm font-extrabold ${audience === a ? "text-[var(--c-accent)]" : "text-[var(--c-ink-2)]"}`}>
                    {n}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--c-muted)] mt-0.5">{AUDIENCE_HINT[a]}</p>
              </button>
            );
          })}
        </div>

        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={respect}
            onChange={(e) => setRespect(e.target.checked)}
            className="mt-0.5 accent-[var(--c-accent)]"
          />
          <span className="text-xs text-[var(--c-ink-2)] leading-relaxed">{tr("ข้ามผู้ที่ปิดรับอีเมลไว้ในการตั้งค่า")}<span className="block text-[11px] text-[var(--c-muted)]">{tr("แนะนำให้เปิดไว้ — ปิดเฉพาะประกาศสำคัญที่ทุกคนต้องรู้")}</span>
          </span>
        </label>
      </section>

      {/* ── Message ──────────────────────────────────────────────────────── */}
      <section className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--c-ink-1)]">{tr("2 · เขียนข้อความ")}</h2>

        <div>
          <label className="block text-xs font-medium text-[var(--c-ink-1)] mb-1.5">{tr("หัวข้อ")}<span className="text-[var(--c-faint)]">({subject.length}/150)</span>
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 150))}
            placeholder={tr("เช่น ปิดปรับปรุงระบบวันเสาร์นี้")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--c-ink-1)] mb-1.5">{tr("เนื้อหา")}<span className="text-[var(--c-faint)]">({body.length}/5000)</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            rows={9}
            placeholder={tr("ข้อความจะแสดงตามที่พิมพ์ รวมถึงการขึ้นบรรทัดใหม่")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)] transition"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(e) => setInApp(e.target.checked)}
            className="mt-0.5 accent-[var(--c-accent)]"
          />
          <span className="text-xs text-[var(--c-ink-2)] leading-relaxed">{tr("แจ้งเตือนในเว็บด้วย")}<span className="block text-[11px] text-[var(--c-muted)]">{tr("ผู้รับจะเห็นในกระดิ่งแจ้งเตือนแม้อีเมลจะเข้าถังสแปม")}</span>
          </span>
        </label>
      </section>

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      {(subject.trim() || body.trim()) && (
        <section className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
          <h2 className="text-sm font-bold text-[var(--c-ink-1)] mb-3">{tr("ตัวอย่างอีเมล")}</h2>
          <div className="rounded-xl border border-[#e3e8f0] bg-[#f7f9fc] p-4">
            <p className="text-[10px] font-bold tracking-widest text-[var(--c-muted)] uppercase">PSU Store</p>
            <p className="text-base font-semibold text-[var(--c-heading)] mt-1 mb-3 break-words">
              {subject || tr("(ยังไม่มีหัวข้อ)")}
            </p>
            <div className="border-l-[3px] border-[var(--c-heading)] bg-[var(--c-surface)] rounded-r-lg px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words text-[var(--c-ink)]">
              {body || tr("(ยังไม่มีเนื้อหา)")}
            </div>
          </div>
        </section>
      )}

      {/* ── Send ─────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <h2 className="text-sm font-bold text-[var(--c-ink-1)] mb-3">{tr("3 · ส่ง")}</h2>

        {result && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-sm mb-4 border ${
              result.success
                ? "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]"
                : "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
            }`}
          >
            {result.success ? tr(result.message) : tr(result.error)}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={tr("อีเมลสำหรับทดสอบ")}
              className="w-56 px-3 py-2.5 rounded-xl border border-[var(--c-line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)] transition"
            />
            <button
              type="button"
              disabled={!canSend || pending || !testTo.includes("@")}
              onClick={() => run(true)}
              className="px-4 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50 whitespace-nowrap"
            >{tr("✉️ ส่งทดสอบ")}</button>
          </div>

          <button
            type="button"
            disabled={!canSend || pending || reachable === 0}
            onClick={() => setConfirm(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--c-accent)] text-white text-sm font-bold hover:bg-[var(--c-accent-str)] transition disabled:opacity-50"
          >{tr("📣 ส่งถึง {0} คน", [reachable])}</button>
        </div>

        <p className="text-[11px] text-[var(--c-muted)] mt-3">{tr("ส่งแยกฉบับต่อคน ผู้รับจะไม่เห็นอีเมลของกันและกัน · จำกัดครั้งละ 200 คน")}</p>
      </section>

      {/* ── Confirm ──────────────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={pending ? undefined : () => setConfirm(false)} />
          <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--c-ink)]">{tr("ยืนยันการส่ง?")}</h3>
            <p className="text-sm text-[var(--c-ink-2)] leading-relaxed">{tr("อีเมลจะถูกส่งถึง")}<span className="font-bold text-[var(--c-accent)]">{tr("{0} คน", [reachable])}</span>{tr("ในกลุ่ม &ldquo;{0}&rdquo; ทันที และ", [tr(AUDIENCE_LABEL[audience])])}<span className="font-semibold">{tr("ยกเลิกไม่ได้")}</span>
            </p>
            <div className="rounded-xl bg-[var(--c-subtle)] border border-[var(--c-line)] px-4 py-3">
              <p className="text-xs text-[var(--c-muted)]">{tr("หัวข้อ")}</p>
              <p className="text-sm font-medium text-[var(--c-ink)] break-words">{subject}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => run(false)}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-[var(--c-accent)] text-sm font-bold text-white hover:bg-[var(--c-accent-str)] transition disabled:opacity-50"
              >
                {pending ? "กำลังส่ง…" : tr("ส่งเลย")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
