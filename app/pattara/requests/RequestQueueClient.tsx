"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveBorrow, rejectBorrow } from "@/lib/actions/borrow-orders";
import { BORROW_CATEGORY_LABEL } from "@/lib/borrow-config";

/* eslint-disable @typescript-eslint/no-explicit-any */

type History = Record<string, { completed: number; late: number; open: number }>;

export default function RequestQueueClient({
  orders, history,
}: {
  orders: any[];
  history: History;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen]   = useState<string | null>(null);
  const [mode, setMode]   = useState<"approve" | "reject">("approve");
  const [when, setWhen]   = useState("");
  const [where, setWhere] = useState("");
  const [note, setNote]   = useState("");
  const [msg, setMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<any>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: !!res.success, text: res.success ? res.message : res.error });
      if (res.success) {
        setOpen(null); setWhen(""); setWhere(""); setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)]">คำขอยืม</h1>
        <p className="text-[13px] text-[var(--bw-muted)] mt-1">
          {orders.length > 0
            ? `${orders.length} คำขอรอการตัดสินใจ · ถ้าไม่ตอบภายใน 7 วัน ระบบจะยกเลิกให้เอง`
            : "ไม่มีคำขอค้างอยู่"}
        </p>
      </header>

      {msg && (
        <div role="status" className={`rounded-xl px-4 py-3 text-[13px] border ${
          msg.ok ? "bg-[#e8f5ee] border-[#c3e3d1] text-[#1f6b45]" : "bg-[#fdecea] border-[#f6c9c4] text-[#b3261e]"
        }`}>
          {msg.text}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bw-panel text-center py-16">
          <p className="text-[14px] text-[var(--bw-muted)]">คิวว่าง ไม่มีอะไรรออยู่</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => {
            const h = history[o.borrower.id] ?? { completed: 0, late: 0, open: 0 };
            const waited = Math.floor((Date.now() - new Date(o.requestedAt ?? o.createdAt).getTime()) / 86_400_000);
            return (
              <div key={o.id} className="bw-panel">
                <div className="flex gap-4 items-start">
                  <div className="bw-thumb w-16 h-16 flex-shrink-0">
                    {o.item.images?.[0] ? <img src={o.item.images[0]} alt="" /> : <span className="text-2xl opacity-30">📦</span>}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold truncate">{o.item.title}</p>
                        <p className="text-[11.5px] text-[var(--bw-muted)] mt-0.5">
                          {BORROW_CATEGORY_LABEL[o.item.category] ?? o.item.category} · ขอยืม {o.requestedDays} วัน
                        </p>
                      </div>
                      <span className={`bw-pill ${waited >= 5 ? "bw-pill-late" : "bw-pill-wait"}`}>
                        รอมา {waited} วัน
                      </span>
                    </div>

                    {/* Who is asking, and how they have behaved before */}
                    <div className="mt-3 pt-3 border-t border-[var(--bw-line)] flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                      <span>
                        <span className="text-[var(--bw-muted)]">ผู้ขอ </span>
                        <a href={`/user/${o.borrower.id}`} target="_blank" className="font-medium text-[var(--psu-blue)] hover:underline">
                          {o.borrower.name ?? o.borrower.email}
                        </a>
                      </span>
                      <span className="text-[var(--bw-muted)]">คะแนน {o.borrower.trustScore}</span>
                      <span className="text-[var(--bw-muted)]">เคยยืมสำเร็จ {h.completed} ครั้ง</span>
                      {h.late > 0 && <span className="text-[#b3261e] font-medium">เคยคืนช้า {h.late} ครั้ง</span>}
                      {h.open > 1 && <span className="text-[var(--bw-muted)]">กำลังยืมอยู่ {h.open - 1} ชิ้น</span>}
                    </div>

                    {o.purposeNote && (
                      <div className="mt-3 rounded-lg bg-[var(--bw-ground)] border border-[var(--bw-line)] px-3.5 py-2.5">
                        <p className="bw-label mb-1">เหตุผลที่ขอยืม</p>
                        <p className="text-[12.5px] leading-[1.9] whitespace-pre-wrap">{o.purposeNote}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3.5 flex-wrap">
                      <button
                        onClick={() => { setOpen(open === o.id ? null : o.id); setMode("approve"); setWhere(o.office?.location ?? ""); }}
                        className="bw-btn bw-btn-primary !h-9"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => { setOpen(open === o.id ? null : o.id); setMode("reject"); }}
                        className="bw-btn bw-btn-ghost !h-9 !text-[#b3261e] !border-[#f6c9c4]"
                      >
                        ไม่อนุมัติ
                      </button>
                      <a href={`/pattara/orders/${o.id}`} className="bw-btn bw-btn-ghost !h-9">
                        รายละเอียด
                      </a>
                    </div>

                    {open === o.id && mode === "approve" && (
                      <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="bw-label block mb-1.5">นัดรับ (ไม่บังคับ)</label>
                            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="bw-input" />
                          </div>
                          <div>
                            <label className="bw-label block mb-1.5">จุดนัดรับ</label>
                            <input value={where} onChange={(e) => setWhere(e.target.value)} className="bw-input" placeholder="สำนักงานงานภัทร" />
                          </div>
                        </div>
                        <div>
                          <label className="bw-label block mb-1.5">บันทึกภายใน (ผู้ยืมไม่เห็น)</label>
                          <input value={note} onChange={(e) => setNote(e.target.value)} className="bw-input" />
                        </div>
                        <button
                          onClick={() => run(() => approveBorrow(o.id, { pickupAt: when || undefined, location: where, staffNote: note }))}
                          disabled={pending}
                          className="bw-btn bw-btn-primary self-start"
                        >
                          {pending ? "กำลังบันทึก…" : "ยืนยันการอนุมัติ"}
                        </button>
                      </div>
                    )}

                    {open === o.id && mode === "reject" && (
                      <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3">
                        <div>
                          <label className="bw-label block mb-1.5">เหตุผลที่ไม่อนุมัติ (ผู้ขอจะเห็นข้อความนี้)</label>
                          <input value={note} onChange={(e) => setNote(e.target.value)} className="bw-input"
                            placeholder="เช่น อุปกรณ์ถูกจองไว้สำหรับวิชาแล็บสัปดาห์นี้" />
                        </div>
                        <button
                          onClick={() => run(() => rejectBorrow(o.id, note))}
                          disabled={pending || !note.trim()}
                          className="bw-btn bw-btn-ghost !text-[#b3261e] !border-[#f6c9c4] self-start"
                        >
                          {pending ? "กำลังบันทึก…" : "ยืนยันการปฏิเสธ"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
