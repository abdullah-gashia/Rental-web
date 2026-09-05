"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BORROW_STATUS_LABEL, BORROW_STEPS, CONDITION_LABEL,
  BORROW_CATEGORY_LABEL, OVERDUE_GRACE_DAYS,
} from "@/lib/borrow-config";
import {
  scheduleBorrowPickup, confirmBorrowPickup, requestRenewal, decideRenewal,
  requestReturn, scheduleReturn, confirmReturn, cancelBorrow, markBorrowLost,
} from "@/lib/actions/borrow-orders";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PILL: Record<string, string> = {
  REQUESTED: "bw-pill-wait", RENEWAL_REQUESTED: "bw-pill-wait", RETURN_REQUESTED: "bw-pill-wait",
  APPROVED: "bw-pill-go", PICKUP_SCHEDULED: "bw-pill-go", RETURN_SCHEDULED: "bw-pill-go",
  ITEM_HANDED_OVER: "bw-pill-go", RETURNED: "bw-pill-go",
  ACTIVE: "bw-pill-live", RENEWED: "bw-pill-live",
  OVERDUE: "bw-pill-late", LOST: "bw-pill-late", DISPUTED: "bw-pill-late",
  COMPLETED: "bw-pill-done", COMPLETED_WITH_DEDUCTION: "bw-pill-done",
  REJECTED: "bw-pill-off", CANCELLED: "bw-pill-off",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDT = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** Days left, or days over. Negative means late. */
function daysLeft(due: string | null): number | null {
  if (!due) return null;
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[var(--bw-line)] last:border-0">
      <span className="text-[12px] text-[var(--bw-muted)] flex-shrink-0">{k}</span>
      <span className="text-[12.5px] text-right">{v}</span>
    </div>
  );
}

/** Photo picker that compresses in the browser before uploading. */
function PhotoPicker({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    const next = [...photos];
    for (const file of Array.from(files).slice(0, 4)) {
      try {
        const prepared = await prepareImageForUpload(file);
        const fd = new FormData();
        fd.append("file", prepared.file);
        const res  = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.url) next.push(json.url);
        else setErr(json.error ?? "อัปโหลดไม่สำเร็จ");
      } catch {
        setErr("อัปโหลดไม่สำเร็จ");
      }
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-2">
        {photos.map((u) => (
          <div key={u} className="bw-thumb w-16 h-16 relative group">
            <img src={u} alt="" />
            <button
              onClick={() => onChange(photos.filter((x) => x !== u))}
              className="absolute inset-0 bg-black/55 text-white text-[11px] opacity-0 group-hover:opacity-100 transition"
              aria-label="ลบรูปนี้"
            >
              ลบ
            </button>
          </div>
        ))}
        <label className="bw-thumb w-16 h-16 cursor-pointer border-dashed hover:border-[var(--psu-blue)] transition">
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
          <span className="text-[11px] text-[var(--bw-muted)] text-center leading-tight px-1">
            {busy ? "…" : "+ รูป"}
          </span>
        </label>
      </div>
      {err && <p className="text-[11.5px] text-[var(--c-danger)]">{err}</p>}
    </div>
  );
}

export default function BorrowOrderClient({ order, backHref }: { order: any; backHref: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  const [when, setWhen]         = useState("");
  const [where, setWhere]       = useState(order.meetupLocation ?? order.office?.location ?? "");
  const [photos, setPhotos]     = useState<string[]>([]);
  const [note, setNote]         = useState("");
  const [condition, setCond]    = useState("GOOD");
  const [reason, setReason]     = useState("");
  const [panel, setPanel]       = useState<string | null>(null);

  const isOffice   = order.viewerIsOffice;
  const isBorrower = order.viewerIsBorrower;
  const st         = order.status as string;

  const left    = daysLeft(order.dueDate);
  const seen    = new Set((order.statusHistory ?? []).map((h: any) => h.status));
  const closed  = ["COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED", "CANCELLED", "LOST"].includes(st);

  function run(fn: () => Promise<any>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: !!res.success, text: res.success ? res.message : res.error });
      if (res.success) {
        setPanel(null); setPhotos([]); setNote(""); setReason("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div>
        <a href={backHref} className="text-[12.5px] text-[var(--bw-muted)] hover:text-[var(--psu-navy)] transition">
          ← กลับ
        </a>
        <div className="flex items-start justify-between gap-3 flex-wrap mt-2">
          <div>
            <p className="bw-label">{BORROW_CATEGORY_LABEL[order.item.category] ?? order.item.category}</p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] leading-tight mt-1">
              {order.item.title}
            </h1>
            <p className="text-[11.5px] text-[var(--bw-muted)] mt-1 font-mono">{order.refCode}</p>
          </div>
          <span className={`bw-pill ${PILL[st] ?? "bw-pill-off"} !text-[12.5px] !px-3.5 !py-2`}>
            {BORROW_STATUS_LABEL[st] ?? st}
          </span>
        </div>
      </div>

      {msg && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-[13px] border ${
            msg.ok
              ? "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]"
              : "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ── Countdown ────────────────────────────────────────────────── */}
      {!closed && order.dueDate && (
        <div className={`bw-panel !py-3.5 flex items-center justify-between gap-3 flex-wrap ${
          left !== null && left < 0 ? "!border-[var(--c-danger-line)] !bg-[var(--c-danger-soft)]" : ""
        }`}>
          <div>
            <p className="bw-label">กำหนดคืน</p>
            <p className="text-[15px] font-semibold mt-0.5">{fmtDate(order.dueDate)}</p>
          </div>
          <p className={`text-[14px] font-semibold ${left !== null && left < 0 ? "text-[var(--c-danger)]" : "text-[var(--psu-blue)]"}`}>
            {left === null ? "" : left < 0 ? `เลยกำหนดมา ${Math.abs(left)} วัน` : left === 0 ? "ครบกำหนดวันนี้" : `เหลืออีก ${left} วัน`}
          </p>
        </div>
      )}

      {st === "OVERDUE" && (
        <div className="bw-panel !border-[var(--c-danger-line)] !bg-[var(--c-danger-soft)]">
          <p className="text-[13px] text-[var(--c-danger)] leading-[1.9]">
            <strong>เลยกำหนดคืนแล้ว</strong> — ไม่มีค่าปรับเป็นเงิน แต่ถ้าเกิน {OVERDUE_GRACE_DAYS} วัน
            สิทธิ์การยืมจะถูกระงับจนกว่าจะคืนของ กรุณาติดต่องานภัทรเพื่อนัดคืน
          </p>
        </div>
      )}

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <div className="bw-panel">
        <h2 className="bw-h">ขั้นตอน</h2>
        <ol className="bw-steps">
          {BORROW_STEPS.map((step, i) => {
            const done = seen.has(step.key) || (step.key === "COMPLETED" && closed && st.startsWith("COMPLETED"));
            const now  = st === step.key;
            return (
              <li key={step.key} className={`bw-step ${done && !now ? "done" : ""} ${now ? "now" : ""}`}>
                {i > 0 && <span className="bw-step-bar" />}
                <span className="flex flex-col items-center gap-1 w-[74px] text-center">
                  <span className="bw-step-dot">{done && !now ? "✓" : i + 1}</span>
                  <span className={`text-[10.5px] leading-tight ${now ? "font-semibold text-[var(--psu-blue)]" : done ? "text-[var(--bw-ink-2)]" : "text-[#a9b4c4]"}`}>
                    {step.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Details ────────────────────────────────────────────────── */}
        <div className="bw-panel">
          <h2 className="bw-h">รายละเอียด</h2>
          <Row k="ระยะเวลาที่ขอ" v={`${order.requestedDays} วัน`} />
          <Row k="ส่งคำขอเมื่อ"   v={fmtDT(order.requestedAt)} />
          <Row k="อนุมัติเมื่อ"    v={fmtDT(order.approvedAt)} />
          {order.approvedByName && <Row k="อนุมัติโดย" v={order.approvedByName} />}
          <Row k="นัดรับ"        v={fmtDT(order.scheduledPickupAt)} />
          <Row k="รับของจริง"     v={fmtDT(order.actualPickupAt)} />
          <Row k="นัดคืน"        v={fmtDT(order.scheduledReturnAt)} />
          <Row k="คืนจริง"        v={fmtDT(order.actualReturnAt)} />
          <Row k="จุดนัด"         v={order.meetupLocation ?? "—"} />
          <Row k="ต่ออายุแล้ว"    v={`${order.renewalCount} ครั้ง`} />
          {order.returnCondition && (
            <Row k="สภาพตอนคืน" v={CONDITION_LABEL[order.returnCondition] ?? order.returnCondition} />
          )}
          {order.cancelReason && <Row k="เหตุผล" v={order.cancelReason} />}
        </div>

        {/* ── Parties + private notes ────────────────────────────────── */}
        <div className="bw-panel">
          <h2 className="bw-h">ผู้เกี่ยวข้อง</h2>
          <Row k="ผู้ให้ยืม" v={order.office?.name ?? "งานภัทร"} />
          {isOffice && order.borrower && (
            <>
              <Row k="ผู้ยืม" v={order.borrower.name ?? "—"} />
              <Row k="อีเมล"  v={<span className="break-all">{order.borrower.email}</span>} />
              <Row k="คะแนนความน่าเชื่อถือ" v={order.borrower.trustScore} />
            </>
          )}

          {order.purposeNote && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)]">
              <p className="bw-label mb-1.5">เหตุผลที่ขอยืม</p>
              <p className="text-[12.5px] leading-[1.9] text-[var(--bw-ink-2)] whitespace-pre-wrap">
                {order.purposeNote}
              </p>
              <p className="text-[10.5px] text-[var(--bw-muted)] mt-1.5">
                เห็นได้เฉพาะผู้ยืมและเจ้าหน้าที่
              </p>
            </div>
          )}

          {isOffice && order.staffNote && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)]">
              <p className="bw-label mb-1.5">บันทึกภายใน</p>
              <p className="text-[12.5px] leading-[1.9] text-[var(--bw-ink-2)] whitespace-pre-wrap">
                {order.staffNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Photos ───────────────────────────────────────────────────── */}
      {(order.pickupPhotos.length > 0 || order.returnPhotos.length > 0) && (
        <div className="bw-panel">
          <h2 className="bw-h">รูปสภาพอุปกรณ์</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: "ตอนส่งมอบ", list: order.pickupPhotos, note: order.pickupNote },
              { label: "ตอนคืน",    list: order.returnPhotos, note: order.returnNote },
            ].map((g) => (
              <div key={g.label}>
                <p className="bw-label mb-2">{g.label} ({g.list.length})</p>
                {g.list.length === 0 ? (
                  <p className="text-[12px] text-[var(--bw-muted)]">ยังไม่มีรูป</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {g.list.map((u: string) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="bw-thumb w-20 h-20">
                        <img src={u} alt="" />
                      </a>
                    ))}
                  </div>
                )}
                {g.note && <p className="text-[12px] text-[var(--bw-ink-2)] mt-2 leading-[1.8]">{g.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What you can do now ──────────────────────────────────────── */}
      {!closed && (
        <div className="bw-panel">
          <h2 className="bw-h">การดำเนินการ</h2>

          <div className="flex flex-wrap gap-2.5">
            {/* Schedule pickup */}
            {["APPROVED", "PICKUP_SCHEDULED"].includes(st) && (
              <button onClick={() => setPanel(panel === "pickup" ? null : "pickup")} className="bw-btn bw-btn-ghost">
                📅 {order.scheduledPickupAt ? "แก้ไขนัดรับ" : "นัดวันรับของ"}
              </button>
            )}

            {/* Confirm handover */}
            {["APPROVED", "PICKUP_SCHEDULED", "ITEM_HANDED_OVER"].includes(st) && (
              <button
                onClick={() => setPanel(panel === "handover" ? null : "handover")}
                disabled={isBorrower ? order.pickupBorrowerConfirm : order.pickupLenderConfirm}
                className="bw-btn bw-btn-primary"
              >
                ✓ ยืนยัน{isBorrower ? "รับของ" : "ส่งมอบ"}
              </button>
            )}

            {/* Renewal */}
            {isBorrower && ["ACTIVE", "RENEWED", "OVERDUE"].includes(st) && order.item.isRenewable &&
              order.renewalCount < order.item.maxRenewals && (
              <button onClick={() => run(() => requestRenewal(order.id))} disabled={pending} className="bw-btn bw-btn-ghost">
                ⏳ ขอต่ออายุ
              </button>
            )}
            {isOffice && st === "RENEWAL_REQUESTED" && (
              <>
                <button onClick={() => run(() => decideRenewal(order.id, true))} disabled={pending} className="bw-btn bw-btn-primary">
                  อนุมัติต่ออายุ
                </button>
                <button onClick={() => run(() => decideRenewal(order.id, false))} disabled={pending} className="bw-btn bw-btn-ghost">
                  ไม่อนุมัติ
                </button>
              </>
            )}

            {/* Return */}
            {isBorrower && ["ACTIVE", "RENEWED", "OVERDUE"].includes(st) && (
              <button onClick={() => run(() => requestReturn(order.id))} disabled={pending} className="bw-btn bw-btn-ghost">
                📦 แจ้งคืนของ
              </button>
            )}
            {["RETURN_REQUESTED", "RETURN_SCHEDULED", "ACTIVE", "RENEWED", "OVERDUE"].includes(st) && (
              <button onClick={() => setPanel(panel === "retsched" ? null : "retsched")} className="bw-btn bw-btn-ghost">
                📅 {order.scheduledReturnAt ? "แก้ไขนัดคืน" : "นัดวันคืน"}
              </button>
            )}
            {["RETURN_REQUESTED", "RETURN_SCHEDULED", "RETURNED", "ACTIVE", "RENEWED", "OVERDUE"].includes(st) && (
              <button
                onClick={() => setPanel(panel === "return" ? null : "return")}
                disabled={isBorrower ? order.returnBorrowerConfirm : order.returnLenderConfirm}
                className="bw-btn bw-btn-primary"
              >
                ✓ ยืนยันการคืน
              </button>
            )}

            {/* Cancel */}
            {["REQUESTED", "APPROVED", "PICKUP_SCHEDULED"].includes(st) && (
              <button onClick={() => setPanel(panel === "cancel" ? null : "cancel")} className="bw-btn bw-btn-ghost !text-[var(--c-danger)] !border-[var(--c-danger-line)]">
                ยกเลิก
              </button>
            )}

            {/* Lost */}
            {isOffice && ["OVERDUE", "ACTIVE", "RENEWED"].includes(st) && (
              <button onClick={() => setPanel(panel === "lost" ? null : "lost")} className="bw-btn bw-btn-ghost !text-[var(--c-danger)] !border-[var(--c-danger-line)]">
                แจ้งสูญหาย
              </button>
            )}
          </div>

          {/* ── Panels ───────────────────────────────────────────────── */}
          {panel === "pickup" && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3 max-w-lg">
              <div>
                <label className="bw-label block mb-1.5">วันเวลานัดรับ</label>
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="bw-input" />
              </div>
              <div>
                <label className="bw-label block mb-1.5">จุดนัดรับ</label>
                <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="เช่น สำนักงานงานภัทร ชั้น 1" className="bw-input" />
              </div>
              <button
                onClick={() => run(() => scheduleBorrowPickup(order.id, when, where))}
                disabled={pending || !when || !where.trim()}
                className="bw-btn bw-btn-primary self-start"
              >
                บันทึกนัดรับ
              </button>
            </div>
          )}

          {panel === "handover" && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3 max-w-lg">
              <div>
                <label className="bw-label block mb-1.5">
                  รูปสภาพอุปกรณ์{!isBorrower && " (จำเป็น)"}
                </label>
                <PhotoPicker photos={photos} onChange={setPhotos} />
                <p className="text-[11.5px] text-[var(--bw-muted)] mt-1 leading-[1.7]">
                  รูปชุดนี้คือหลักฐานเดียวที่ใช้เทียบตอนคืน
                </p>
              </div>
              <div>
                <label className="bw-label block mb-1.5">หมายเหตุ</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="bw-input" />
              </div>
              <button
                onClick={() => run(() => confirmBorrowPickup(order.id, photos, note))}
                disabled={pending}
                className="bw-btn bw-btn-primary self-start"
              >
                ยืนยัน{isBorrower ? "รับของ" : "ส่งมอบ"}
              </button>
            </div>
          )}

          {panel === "retsched" && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3 max-w-lg">
              <div>
                <label className="bw-label block mb-1.5">วันเวลานัดคืน</label>
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="bw-input" />
              </div>
              <div>
                <label className="bw-label block mb-1.5">จุดนัดคืน</label>
                <input value={where} onChange={(e) => setWhere(e.target.value)} className="bw-input" />
              </div>
              <button
                onClick={() => run(() => scheduleReturn(order.id, when, where))}
                disabled={pending || !when || !where.trim()}
                className="bw-btn bw-btn-primary self-start"
              >
                บันทึกนัดคืน
              </button>
            </div>
          )}

          {panel === "return" && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3 max-w-lg">
              <div>
                <label className="bw-label block mb-1.5">
                  รูปสภาพตอนคืน{!isBorrower && " (จำเป็น)"}
                </label>
                <PhotoPicker photos={photos} onChange={setPhotos} />
              </div>
              {isOffice && (
                <div>
                  <label className="bw-label block mb-1.5">สภาพที่ได้รับคืน</label>
                  <select value={condition} onChange={(e) => setCond(e.target.value)} className="bw-input">
                    {Object.entries(CONDITION_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <p className="text-[11.5px] text-[var(--bw-muted)] mt-1 leading-[1.7]">
                    ถ้าเลือก “พอใช้” หรือ “ต้องซ่อม” ระบบจะบันทึกว่ามีความเสียหาย
                    แต่ไม่มีการเรียกเก็บเงินใด ๆ
                  </p>
                </div>
              )}
              <div>
                <label className="bw-label block mb-1.5">หมายเหตุ</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="bw-input" />
              </div>
              <button
                onClick={() => run(() => confirmReturn(order.id, { photos, condition: isOffice ? condition : undefined, note }))}
                disabled={pending}
                className="bw-btn bw-btn-primary self-start"
              >
                ยืนยันการคืน
              </button>
            </div>
          )}

          {panel === "cancel" && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3 max-w-lg">
              <div>
                <label className="bw-label block mb-1.5">เหตุผลที่ยกเลิก</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="bw-input" />
              </div>
              <button
                onClick={() => run(() => cancelBorrow(order.id, reason))}
                disabled={pending}
                className="bw-btn bw-btn-ghost !text-[var(--c-danger)] !border-[var(--c-danger-line)] self-start"
              >
                ยืนยันการยกเลิก
              </button>
            </div>
          )}

          {panel === "lost" && (
            <div className="mt-4 pt-4 border-t border-[var(--bw-line)] flex flex-col gap-3 max-w-lg">
              <p className="text-[12.5px] text-[var(--bw-ink-2)] leading-[1.9]">
                บันทึกว่าอุปกรณ์สูญหาย ระบบจะระงับสิทธิ์การยืมของผู้ยืม
                แต่จะ<strong>ไม่</strong>เรียกเก็บเงิน — การชดใช้เป็นเรื่องที่เจ้าหน้าที่ตกลงกับนักศึกษาเอง
              </p>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="บันทึกรายละเอียด เช่น ติดต่อไม่ได้ตั้งแต่วันที่…"
                className="bw-input"
              />
              <button
                onClick={() => run(() => markBorrowLost(order.id, reason))}
                disabled={pending || !reason.trim()}
                className="bw-btn bw-btn-ghost !text-[var(--c-danger)] !border-[var(--c-danger-line)] self-start"
              >
                บันทึกว่าสูญหาย
              </button>
            </div>
          )}

          {/* Confirmation state, so nobody wonders who has done what */}
          {["APPROVED", "PICKUP_SCHEDULED", "ITEM_HANDED_OVER"].includes(st) && (
            <p className="text-[12px] text-[var(--bw-muted)] mt-4 pt-4 border-t border-[var(--bw-line)]">
              การส่งมอบ: ผู้ยืม {order.pickupBorrowerConfirm ? "✓ ยืนยันแล้ว" : "○ ยังไม่ยืนยัน"} ·
              เจ้าหน้าที่ {order.pickupLenderConfirm ? "✓ ยืนยันแล้ว" : "○ ยังไม่ยืนยัน"}
            </p>
          )}
          {["RETURN_REQUESTED", "RETURN_SCHEDULED", "RETURNED"].includes(st) && (
            <p className="text-[12px] text-[var(--bw-muted)] mt-4 pt-4 border-t border-[var(--bw-line)]">
              การคืน: ผู้ยืม {order.returnBorrowerConfirm ? "✓ ยืนยันแล้ว" : "○ ยังไม่ยืนยัน"} ·
              เจ้าหน้าที่ {order.returnLenderConfirm ? "✓ ยืนยันแล้ว" : "○ ยังไม่ยืนยัน"}
            </p>
          )}
        </div>
      )}

      {/* ── History ──────────────────────────────────────────────────── */}
      <div className="bw-panel">
        <h2 className="bw-h">ประวัติสถานะ ({order.statusHistory.length})</h2>
        {order.statusHistory.length === 0 ? (
          <p className="text-[12.5px] text-[var(--bw-muted)]">ยังไม่มีประวัติ</p>
        ) : (
          <ol className="flex flex-col">
            {[...order.statusHistory].reverse().map((h: any, i: number) => (
              <li key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full mt-2 ${i === 0 ? "bg-[var(--psu-blue)]" : "bg-[var(--bw-line-2)]"}`} />
                  {i < order.statusHistory.length - 1 && <span className="flex-1 w-px bg-[var(--bw-line)] my-1" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`bw-pill ${PILL[h.status] ?? "bw-pill-off"}`}>
                      {BORROW_STATUS_LABEL[h.status] ?? h.status}
                    </span>
                    <span className="text-[11px] text-[var(--bw-muted)]">{fmtDT(h.changedAt)}</span>
                    {h.by && <span className="text-[11px] text-[var(--bw-muted)]">· {h.by}</span>}
                  </div>
                  {h.note && <p className="text-[12.5px] text-[var(--bw-ink-2)] mt-1 leading-[1.8]">{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
