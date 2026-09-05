"use client";

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
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
          ยังส่งอีเมลไม่ได้ — ตั้งค่า <code className="font-mono text-xs">GMAIL_USER</code> และ{" "}
          <code className="font-mono text-xs">GMAIL_APP_PASSWORD</code> ก่อน
        </div>
      )}

      {/* ── Audience ─────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#dfe7f2] p-5">
        <h2 className="text-sm font-bold text-[#1e2d47] mb-1">1 · เลือกกลุ่มผู้รับ</h2>
        <p className="text-xs text-[#64748b] mb-4">
          ไม่รวมบัญชีที่ถูกแบนและบัญชีผู้ดูแลระบบ
        </p>

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
                    ? "border-[#2563eb] bg-[#2563eb]/5 ring-1 ring-[#2563eb]/25"
                    : "border-[#dfe7f2] hover:border-[#c3d0e2]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#0f1e35]">{AUDIENCE_LABEL[a]}</span>
                  <span className={`text-sm font-extrabold ${audience === a ? "text-[#2563eb]" : "text-[#3d4d66]"}`}>
                    {n}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b] mt-0.5">{AUDIENCE_HINT[a]}</p>
              </button>
            );
          })}
        </div>

        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={respect}
            onChange={(e) => setRespect(e.target.checked)}
            className="mt-0.5 accent-[#2563eb]"
          />
          <span className="text-xs text-[#3d4d66] leading-relaxed">
            ข้ามผู้ที่ปิดรับอีเมลไว้ในการตั้งค่า
            <span className="block text-[11px] text-[#64748b]">
              แนะนำให้เปิดไว้ — ปิดเฉพาะประกาศสำคัญที่ทุกคนต้องรู้
            </span>
          </span>
        </label>
      </section>

      {/* ── Message ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#dfe7f2] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#1e2d47]">2 · เขียนข้อความ</h2>

        <div>
          <label className="block text-xs font-medium text-[#1e2d47] mb-1.5">
            หัวข้อ <span className="text-[#94a3b8]">({subject.length}/150)</span>
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 150))}
            placeholder="เช่น ปิดปรับปรุงระบบวันเสาร์นี้"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#dfe7f2] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#1e2d47] mb-1.5">
            เนื้อหา <span className="text-[#94a3b8]">({body.length}/5000)</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            rows={9}
            placeholder="ข้อความจะแสดงตามที่พิมพ์ รวมถึงการขึ้นบรรทัดใหม่"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#dfe7f2] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(e) => setInApp(e.target.checked)}
            className="mt-0.5 accent-[#2563eb]"
          />
          <span className="text-xs text-[#3d4d66] leading-relaxed">
            แจ้งเตือนในเว็บด้วย
            <span className="block text-[11px] text-[#64748b]">
              ผู้รับจะเห็นในกระดิ่งแจ้งเตือนแม้อีเมลจะเข้าถังสแปม
            </span>
          </span>
        </label>
      </section>

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      {(subject.trim() || body.trim()) && (
        <section className="bg-white rounded-2xl border border-[#dfe7f2] p-5">
          <h2 className="text-sm font-bold text-[#1e2d47] mb-3">ตัวอย่างอีเมล</h2>
          <div className="rounded-xl border border-[#e3e8f0] bg-[#f7f9fc] p-4">
            <p className="text-[10px] font-bold tracking-widest text-[#64748b] uppercase">PSU Store</p>
            <p className="text-base font-semibold text-[#0a2b5e] mt-1 mb-3 break-words">
              {subject || "(ยังไม่มีหัวข้อ)"}
            </p>
            <div className="border-l-[3px] border-[#0a2b5e] bg-white rounded-r-lg px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words text-[#0f1e35]">
              {body || "(ยังไม่มีเนื้อหา)"}
            </div>
          </div>
        </section>
      )}

      {/* ── Send ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#dfe7f2] p-5">
        <h2 className="text-sm font-bold text-[#1e2d47] mb-3">3 · ส่ง</h2>

        {result && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-sm mb-4 border ${
              result.success
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {result.success ? result.message : result.error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="อีเมลสำหรับทดสอบ"
              className="w-56 px-3 py-2.5 rounded-xl border border-[#dfe7f2] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition"
            />
            <button
              type="button"
              disabled={!canSend || pending || !testTo.includes("@")}
              onClick={() => run(true)}
              className="px-4 py-2.5 rounded-xl border border-[#dfe7f2] text-sm font-semibold text-[#3d4d66] hover:bg-[#f1f5fb] transition disabled:opacity-50 whitespace-nowrap"
            >
              ✉️ ส่งทดสอบ
            </button>
          </div>

          <button
            type="button"
            disabled={!canSend || pending || reachable === 0}
            onClick={() => setConfirm(true)}
            className="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8] transition disabled:opacity-50"
          >
            📣 ส่งถึง {reachable} คน
          </button>
        </div>

        <p className="text-[11px] text-[#64748b] mt-3">
          ส่งแยกฉบับต่อคน ผู้รับจะไม่เห็นอีเมลของกันและกัน · จำกัดครั้งละ 200 คน
        </p>
      </section>

      {/* ── Confirm ──────────────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={pending ? undefined : () => setConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0f1e35]">ยืนยันการส่ง?</h3>
            <p className="text-sm text-[#3d4d66] leading-relaxed">
              อีเมลจะถูกส่งถึง <span className="font-bold text-[#2563eb]">{reachable} คน</span> ในกลุ่ม
              &ldquo;{AUDIENCE_LABEL[audience]}&rdquo; ทันที และ<span className="font-semibold">ยกเลิกไม่ได้</span>
            </p>
            <div className="rounded-xl bg-[#f7f9fd] border border-[#dfe7f2] px-4 py-3">
              <p className="text-xs text-[#64748b]">หัวข้อ</p>
              <p className="text-sm font-medium text-[#0f1e35] break-words">{subject}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl border border-[#dfe7f2] text-sm font-semibold text-[#3d4d66] hover:bg-[#f1f5fb] transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => run(false)}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#1d4ed8] transition disabled:opacity-50"
              >
                {pending ? "กำลังส่ง…" : "ส่งเลย"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
