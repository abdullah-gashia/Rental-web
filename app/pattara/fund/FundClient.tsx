"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordFundEntry, deleteFundEntry, type FundEntryInput } from "@/lib/actions/fund";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

/* eslint-disable @typescript-eslint/no-explicit-any */

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SOURCE_LABEL: Record<string, string> = {
  PURCHASE:    "ซื้ออุปกรณ์",
  MAINTENANCE: "ซ่อมบำรุง",
  DONATION:    "เงินบริจาค",
  ADJUSTMENT:  "ปรับยอด",
};

const blank: FundEntryInput = {
  kind: "OUT", source: "PURCHASE", amount: 0, note: "", receiptUrl: "",
  occurredAt: new Date().toISOString().slice(0, 10),
};

export default function FundClient({ summary, entries }: { summary: any; entries: any[] }) {
  const tr = useLocaleStore((s) => s.tr);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm]   = useState<FundEntryInput>(blank);
  const [open, setOpen]   = useState(false);
  const [msg, setMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  function run(fn: () => Promise<any>, close = false) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: !!res.success, text: res.success ? tr(res.message) : tr(res.error) });
      if (res.success) {
        if (close) { setOpen(false); setForm(blank); }
        router.refresh();
      }
    });
  }

  async function uploadReceipt(file: File | undefined) {
  const tr = useLocaleStore((s) => s.tr);
    if (!file) return;
    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file);
      const fd = new FormData();
      fd.append("file", prepared.file);
      const json = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (json.url) setForm((f) => ({ ...f, receiptUrl: json.url }));
      else setMsg({ ok: false, text: tr(json.error ?? tr("อัปโหลดไม่สำเร็จ")) });
    } catch {
      setMsg({ ok: false, text: tr("อัปโหลดไม่สำเร็จ") });
    }
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)]">{tr("กองทุน")}</h1>
          <p className="text-[13px] text-[var(--bw-muted)] mt-1 max-w-[60ch] leading-[1.9]">{tr("ค่าธรรมเนียมทุกบาทที่ระบบเก็บได้เข้ากองทุนนี้ทั้งหมด รายรับคำนวณสดจากคำสั่งซื้อและการเช่าที่จบแล้ว จึงไม่ต้องบันทึกเอง — บันทึกเฉพาะตอนใช้เงิน")}</p>
        </div>
        <button onClick={() => { setOpen(true); setMsg(null); }} className="bw-btn bw-btn-primary">{tr("+ บันทึกรายการ")}</button>
      </header>

      {msg && !open && (
        <div role="status" className={`rounded-xl px-4 py-3 text-[13px] border ${
          msg.ok ? "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]" : "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Balance ────────────────────────────────────────────────────── */}
      <div className="bw-panel !p-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--bw-line)]">
          {[
            { k: tr("รายรับจากค่าธรรมเนียม"), v: baht(summary.incomeTotal), sub: tr("ขาย {0} · เช่า {1}", [baht(summary.incomeFromSales), baht(summary.incomeFromRentals)]) },
            { k: tr("เงินบริจาค / ปรับยอด"),  v: baht(summary.otherIn),     sub: tr("บันทึกด้วยมือ") },
            { k: tr("ใช้ไปแล้ว"),             v: baht(summary.spentTotal),  sub: tr("ซื้ออุปกรณ์ {0} ชิ้น", [summary.itemsBought]) },
            { k: tr("คงเหลือ"),               v: baht(summary.balance),     sub: tr("พร้อมใช้ซื้อของ"), hi: true },
          ].map((s) => (
            <div key={s.k} className="px-5 py-4">
              <p className="bw-label">{s.k}</p>
              <p className={`bw-num text-[20px] font-semibold mt-1.5 leading-none ${s.hi ? "text-[var(--psu-blue)]" : "text-[var(--psu-navy)]"}`}>
                {s.v}
              </p>
              <p className="text-[11px] text-[var(--bw-muted)] mt-1.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ledger ─────────────────────────────────────────────────────── */}
      <div className="bw-panel !p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--bw-line)]">
          <h2 className="text-[14.5px] font-semibold text-[var(--psu-navy)]">{tr("รายการเคลื่อนไหว")}<span className="ml-2 text-[12px] font-normal text-[var(--bw-muted)]">{tr("{0} รายการ", [entries.length])}</span>
          </h2>
        </div>

        {entries.length === 0 ? (
          <p className="text-center py-14 text-[13px] text-[var(--bw-muted)]">{tr("ยังไม่มีรายการ — บันทึกครั้งแรกเมื่อซื้ออุปกรณ์เข้าคลัง")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[var(--bw-ground)] border-b border-[var(--bw-line)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">{tr("วันที่")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">{tr("รายการ")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">{tr("ประเภท")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--bw-ink-2)]">{tr("จำนวน")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--bw-ink-2)]"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--bw-line)] last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap bw-num text-[12px]">
                      {new Date(e.occurredAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate max-w-[300px]">{e.note}</p>
                      <p className="text-[11px] text-[var(--bw-muted)]">
                        บันทึกโดย {e.recordedBy ?? "—"}
                        {e.items.length > 0 && tr(" · ผูกกับ {0} ชิ้น", [e.items.length])}
                        {e.receiptUrl && (
                          <> · <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--psu-blue)] hover:underline">{tr("ดูใบเสร็จ")}</a></>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--bw-ink-2)]">
                      {tr(SOURCE_LABEL[e.source] ?? e.source)}
                    </td>
                    <td className={`px-4 py-3 text-right bw-num font-semibold whitespace-nowrap ${
                      e.kind === "OUT" ? "text-[var(--c-danger)]" : "text-[var(--c-ok)]"
                    }`}>
                      {e.kind === "OUT" ? "−" : "+"}{baht(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => run(() => deleteFundEntry(e.id))}
                        disabled={pending}
                        className="text-[12px] text-[var(--bw-muted)] hover:text-[var(--c-danger)] transition"
                      >{tr("ลบ")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New entry ──────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={pending ? undefined : () => setOpen(false)} />
          <div className="relative bg-[var(--c-surface)] rounded-2xl w-full max-w-lg p-6 border border-[var(--bw-line)]">
            <h2 className="text-[17px] font-semibold text-[var(--psu-navy)] mb-1">{tr("บันทึกรายการกองทุน")}</h2>
            <p className="text-[12px] text-[var(--bw-muted)] mb-5">{tr("คงเหลือตอนนี้ {0}", [baht(summary.balance)])}</p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="bw-label block mb-1.5">{tr("ทิศทาง")}</label>
                  <select
                    value={form.kind}
                    onChange={(e) => {
                      const kind = e.target.value as "IN" | "OUT";
                      setForm({ ...form, kind, source: kind === "OUT" ? "PURCHASE" : "DONATION" });
                    }}
                    className="bw-input"
                  >
                    <option value="OUT">{tr("จ่ายออก")}</option>
                    <option value="IN">{tr("รับเข้า")}</option>
                  </select>
                </div>
                <div>
                  <label className="bw-label block mb-1.5">{tr("ประเภท")}</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as FundEntryInput["source"] })} className="bw-input">
                    {(form.kind === "OUT" ? ["PURCHASE", "MAINTENANCE", "ADJUSTMENT"] : ["DONATION", "ADJUSTMENT"]).map((s) => (
                      <option key={s} value={s}>{tr(SOURCE_LABEL[s])}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="bw-label block mb-1.5">{tr("จำนวนเงิน (บาท)")}</label>
                  <input type="number" min={0} step="0.01" value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="bw-input" />
                </div>
                <div>
                  <label className="bw-label block mb-1.5">{tr("วันที่")}</label>
                  <input type="date" value={form.occurredAt}
                    onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} className="bw-input" />
                </div>
              </div>

              <div>
                <label className="bw-label block mb-1.5">{tr("รายละเอียด")}</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="bw-input" placeholder={tr("เช่น เครื่องคิดเลข Casio fx-991 จำนวน 5 เครื่อง")} />
              </div>

              <div>
                <label className="bw-label block mb-1.5">{tr("รูปใบเสร็จ (ไม่บังคับ)")}</label>
                {form.receiptUrl ? (
                  <div className="flex items-center gap-3">
                    <a href={form.receiptUrl} target="_blank" rel="noopener noreferrer" className="bw-thumb w-16 h-16">
                      <img src={form.receiptUrl} alt="" />
                    </a>
                    <button onClick={() => setForm({ ...form, receiptUrl: "" })} className="text-[12px] text-[var(--bw-muted)] hover:text-[var(--c-danger)]">{tr("ลบรูป")}</button>
                  </div>
                ) : (
                  <label className="bw-btn bw-btn-ghost cursor-pointer inline-flex">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadReceipt(e.target.files?.[0])} />
                    {uploading ? tr("กำลังอัป…") : tr("แนบรูปใบเสร็จ")}
                  </label>
                )}
              </div>

              {msg && (
                <div role="alert" className={`rounded-xl px-3.5 py-2.5 text-[12.5px] border ${
                  msg.ok ? "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]" : "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
                }`}>
                  {msg.text}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} disabled={pending} className="bw-btn bw-btn-ghost flex-1">{tr("ยกเลิก")}</button>
                <button
                  onClick={() => run(() => recordFundEntry(form), true)}
                  disabled={pending || uploading || !form.note.trim() || form.amount <= 0}
                  className="bw-btn bw-btn-primary flex-1"
                >
                  {pending ? tr("กำลังบันทึก…") : tr("บันทึก")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
