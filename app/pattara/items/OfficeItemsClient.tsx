"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBorrowItem, updateBorrowItem, setBorrowItemStatus, deleteBorrowItem,
  type ItemInput,
} from "@/lib/actions/borrow-items";
import { prepareImageForUpload } from "@/lib/utils/image-upload";
import {
  BORROW_CATEGORY_LABEL, BORROW_CATEGORIES, CONDITION_LABEL,
  ITEM_STATUS_LABEL, MAX_BORROW_DAYS,
} from "@/lib/borrow-config";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_PILL: Record<string, string> = {
  AVAILABLE: "bw-pill-live", RESERVED: "bw-pill-wait", LENT_OUT: "bw-pill-go",
  UNAVAILABLE: "bw-pill-off", SUSPENDED: "bw-pill-off",
};

const blank: ItemInput = {
  title: "", description: "", category: "STUDY_SUPPLIES", condition: "GOOD",
  images: [], assetTag: "", maxLendingDays: 14, minLendingDays: 1,
  isRenewable: true, maxRenewals: 1, meetupLocations: [],
  purchasePrice: null, fundEntryId: null,
};

export default function OfficeItemsClient({
  items, purchases,
}: {
  items: any[];
  purchases: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [filter, setFilter] = useState("all");
  const [query, setQuery]   = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm]     = useState<ItemInput>(blank);
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      return i.title.toLowerCase().includes(q) || (i.assetTag ?? "").toLowerCase().includes(q);
    });
  }, [items, filter, query]);

  function openNew() {
    setEditing({ id: null });
    setForm(blank);
    setMsg(null);
  }

  function openEdit(i: any) {
    setEditing(i);
    setForm({
      title: i.title, description: i.description ?? "", category: i.category,
      condition: i.condition, images: i.images, assetTag: i.assetTag ?? "",
      maxLendingDays: i.maxLendingDays, minLendingDays: i.minLendingDays,
      isRenewable: i.isRenewable, maxRenewals: i.maxRenewals,
      meetupLocations: i.meetupLocations, purchasePrice: i.purchasePrice, fundEntryId: null,
    });
    setMsg(null);
  }

  function run(fn: () => Promise<any>, closeAfter = false) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      setMsg({ ok: !!res.success, text: res.success ? res.message : res.error });
      if (res.success) {
        if (closeAfter) setEditing(null);
        router.refresh();
      }
    });
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const next = [...form.images];
    for (const file of Array.from(files).slice(0, 8 - next.length)) {
      try {
        const prepared = await prepareImageForUpload(file);
        const fd = new FormData();
        fd.append("file", prepared.file);
        const json = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
        if (json.url) next.push(json.url);
        else setMsg({ ok: false, text: json.error ?? "อัปโหลดรูปไม่สำเร็จ" });
      } catch {
        setMsg({ ok: false, text: "อัปโหลดรูปไม่สำเร็จ" });
      }
    }
    setForm({ ...form, images: next });
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)]">คลังอุปกรณ์</h1>
          <p className="text-[13px] text-[var(--bw-muted)] mt-1">
            หนึ่งแถวคือของหนึ่งชิ้นจริง — ติดตามได้ว่าชิ้นไหนอยู่กับใคร
          </p>
        </div>
        <button onClick={openNew} className="bw-btn bw-btn-primary">+ เพิ่มอุปกรณ์</button>
      </header>

      {msg && !editing && (
        <div role="status" className={`rounded-xl px-4 py-3 text-[13px] border ${
          msg.ok ? "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]" : "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "AVAILABLE", "RESERVED", "LENT_OUT", "SUSPENDED", "UNAVAILABLE"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`bw-pill !text-[12px] !px-3 !py-1.5 ${filter === s ? "bw-pill-go" : "bw-pill-done"}`}
          >
            {s === "all" ? "ทั้งหมด" : ITEM_STATUS_LABEL[s]} <span className="bw-num opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อ / รหัสครุภัณฑ์"
          className="bw-input !h-8 !text-[12.5px] w-52 ml-auto"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bw-panel !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--bw-ground)] border-b border-[var(--bw-line)]">
                <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">อุปกรณ์</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">หมวด</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">สถานะ</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">อยู่กับใคร</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--bw-ink-2)]">ให้ยืมแล้ว</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--bw-ink-2)]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-[var(--bw-muted)]">
                    {items.length === 0 ? "ยังไม่มีอุปกรณ์ในคลัง — กด “เพิ่มอุปกรณ์” เพื่อเริ่ม" : "ไม่พบรายการที่ตรงกับตัวกรอง"}
                  </td>
                </tr>
              ) : shown.map((i) => (
                <tr key={i.id} className="border-b border-[var(--bw-line)] last:border-0 hover:bg-[var(--bw-tint)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bw-thumb w-10 h-10 flex-shrink-0">
                        {i.images?.[0] ? <img src={i.images[0]} alt="" /> : <span className="text-sm opacity-30">📦</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[220px]">{i.title}</p>
                        <p className="text-[11px] text-[var(--bw-muted)]">
                          {i.assetTag ?? "ไม่มีรหัส"} · {CONDITION_LABEL[i.condition] ?? i.condition}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--bw-ink-2)]">
                    {BORROW_CATEGORY_LABEL[i.category] ?? i.category}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`bw-pill ${STATUS_PILL[i.status] ?? "bw-pill-off"}`}>
                      {ITEM_STATUS_LABEL[i.status] ?? i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    {i.heldBy ? (
                      <a href={`/pattara/orders/${i.openOrderId}`} className="text-[var(--psu-blue)] hover:underline">
                        {i.heldBy}
                        {i.dueDate && (
                          <span className="block text-[10.5px] text-[var(--bw-muted)]">
                            คืน {new Date(i.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </a>
                    ) : <span className="text-[var(--bw-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right bw-num">{i.totalLentCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(i)} className="bw-btn bw-btn-ghost !h-8 !px-3 !text-[12px]">แก้ไข</button>
                      {i.status === "AVAILABLE" && (
                        <button
                          onClick={() => run(() => setBorrowItemStatus(i.id, "SUSPENDED"))}
                          disabled={pending}
                          className="bw-btn bw-btn-ghost !h-8 !px-3 !text-[12px]"
                        >
                          พัก
                        </button>
                      )}
                      {(i.status === "SUSPENDED" || i.status === "UNAVAILABLE") && (
                        <button
                          onClick={() => run(() => setBorrowItemStatus(i.id, "AVAILABLE"))}
                          disabled={pending}
                          className="bw-btn bw-btn-ghost !h-8 !px-3 !text-[12px]"
                        >
                          เปิดให้ยืม
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-[500] flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={pending ? undefined : () => setEditing(null)} />
          <div className="relative bg-[var(--c-surface)] rounded-2xl w-full max-w-2xl my-8 p-6 border border-[var(--bw-line)]">
            <h2 className="text-[17px] font-semibold text-[var(--psu-navy)] mb-5">
              {editing.id ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}
            </h2>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
                <div>
                  <label className="bw-label block mb-1.5">ชื่ออุปกรณ์</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bw-input" placeholder="เช่น เครื่องคิดเลขวิทยาศาสตร์ Casio fx-991" />
                </div>
                <div>
                  <label className="bw-label block mb-1.5">รหัสครุภัณฑ์</label>
                  <input value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} className="bw-input" placeholder="PSU-CAL-014" />
                </div>
              </div>

              <div>
                <label className="bw-label block mb-1.5">รายละเอียด</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bw-input" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="bw-label block mb-1.5">หมวดหมู่</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bw-input">
                    {BORROW_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{BORROW_CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="bw-label block mb-1.5">สภาพ</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as ItemInput["condition"] })} className="bw-input">
                    {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="bw-label block mb-1.5">ยืมได้นานสุด</label>
                  <input type="number" min={1} max={MAX_BORROW_DAYS} value={form.maxLendingDays}
                    onChange={(e) => setForm({ ...form, maxLendingDays: Number(e.target.value) })} className="bw-input" />
                </div>
                <div>
                  <label className="bw-label block mb-1.5">ยืมขั้นต่ำ</label>
                  <input type="number" min={1} value={form.minLendingDays}
                    onChange={(e) => setForm({ ...form, minLendingDays: Number(e.target.value) })} className="bw-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.isRenewable}
                    onChange={(e) => setForm({ ...form, isRenewable: e.target.checked })}
                    className="accent-[var(--psu-blue)]" />
                  ต่ออายุได้
                </label>
                <div>
                  <label className="bw-label block mb-1.5">ต่ออายุได้กี่ครั้ง</label>
                  <input type="number" min={0} max={5} value={form.maxRenewals} disabled={!form.isRenewable}
                    onChange={(e) => setForm({ ...form, maxRenewals: Number(e.target.value) })} className="bw-input" />
                </div>
                <div>
                  <label className="bw-label block mb-1.5">ราคาที่ซื้อมา (บาท)</label>
                  <input type="number" min={0} value={form.purchasePrice ?? ""}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value === "" ? null : Number(e.target.value) })}
                    className="bw-input" placeholder="ไม่บังคับ" />
                </div>
              </div>

              <div>
                <label className="bw-label block mb-1.5">จุดรับ–คืนของ (คั่นด้วยจุลภาค)</label>
                <input
                  value={form.meetupLocations.join(", ")}
                  onChange={(e) => setForm({ ...form, meetupLocations: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
                  className="bw-input"
                  placeholder="สำนักงานงานภัทร ชั้น 1, ห้องกิจการนักศึกษา"
                />
              </div>

              {!editing.id && purchases.length > 0 && (
                <div>
                  <label className="bw-label block mb-1.5">ผูกกับใบซื้อในกองทุน</label>
                  <select
                    value={form.fundEntryId ?? ""}
                    onChange={(e) => setForm({ ...form, fundEntryId: e.target.value || null })}
                    className="bw-input"
                  >
                    <option value="">ไม่ผูก</option>
                    {purchases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <p className="text-[11px] text-[var(--bw-muted)] mt-1.5">
                    ผูกไว้เพื่อให้หน้าเว็บบอกได้ว่าเงินก้อนไหนกลายเป็นของชิ้นนี้
                  </p>
                </div>
              )}

              <div>
                <label className="bw-label block mb-1.5">รูปภาพ ({form.images.length}/8)</label>
                <div className="flex gap-2 flex-wrap">
                  {form.images.map((u) => (
                    <div key={u} className="bw-thumb w-20 h-20 relative group">
                      <img src={u} alt="" />
                      <button
                        onClick={() => setForm({ ...form, images: form.images.filter((x) => x !== u) })}
                        className="absolute inset-0 bg-black/55 text-white text-[11px] opacity-0 group-hover:opacity-100 transition"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                  {form.images.length < 8 && (
                    <label className="bw-thumb w-20 h-20 cursor-pointer border-dashed hover:border-[var(--psu-blue)] transition">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                      <span className="text-[11px] text-[var(--bw-muted)]">{uploading ? "กำลังอัป…" : "+ รูป"}</span>
                    </label>
                  )}
                </div>
              </div>

              {msg && (
                <div role="alert" className={`rounded-xl px-3.5 py-2.5 text-[12.5px] border ${
                  msg.ok ? "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]" : "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
                }`}>
                  {msg.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(null)} disabled={pending} className="bw-btn bw-btn-ghost flex-1">
                  ปิด
                </button>
                {editing.id && (
                  <button
                    onClick={() => run(() => deleteBorrowItem(editing.id), true)}
                    disabled={pending}
                    className="bw-btn bw-btn-ghost !text-[var(--c-danger)] !border-[var(--c-danger-line)]"
                  >
                    ลบ
                  </button>
                )}
                <button
                  onClick={() => run(() => editing.id ? updateBorrowItem(editing.id, form) : createBorrowItem(form), true)}
                  disabled={pending || uploading || !form.title.trim()}
                  className="bw-btn bw-btn-primary flex-1"
                >
                  {pending ? "กำลังบันทึก…" : editing.id ? "บันทึก" : "เพิ่มเข้าคลัง"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
