"use client";

import { useState, useMemo } from "react";
import {
  BORROW_STATUS_LABEL, BORROW_CATEGORY_LABEL,
  MAX_CONCURRENT_BORROWS, OPEN_STATUSES,
} from "@/lib/borrow-config";

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

const TABS = [
  { key: "open",  label: "กำลังดำเนินการ" },
  { key: "done",  label: "จบแล้ว" },
  { key: "all",   label: "ทั้งหมด" },
] as const;

const DONE = ["COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED", "CANCELLED", "LOST"];

function daysLeft(due: string | null) {
  if (!due) return null;
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
}

export default function MyBorrowsClient({
  orders, suspendedUntil, tier,
}: {
  orders: any[];
  suspendedUntil: string | null;
  tier: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");

  const shown = useMemo(() => {
    if (tab === "all")  return orders;
    if (tab === "done") return orders.filter((o) => DONE.includes(o.status));
    return orders.filter((o) => !DONE.includes(o.status));
  }, [orders, tab]);

  const holding = orders.filter((o) => (OPEN_STATUSES as readonly string[]).includes(o.status)).length;
  const suspended = suspendedUntil && new Date(suspendedUntil) > new Date();
  const soonest = orders
    .filter((o) => o.dueDate && !DONE.includes(o.status))
    .map((o) => daysLeft(o.dueDate))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0];

  // Rendered inside the dashboard shell, so this only pulls in the borrow
  // colour tokens — the page background belongs to the dashboard.
  return (
    <div className="bw-scope">
      <div>
        <div>

          <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="bw-label mb-1.5">งานภัทร</p>
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] leading-tight">
                ของที่ยืม
              </h1>
              <p className="text-[13px] text-[var(--bw-muted)] mt-1.5">
                ยืมอยู่ {holding} จาก {MAX_CONCURRENT_BORROWS} ชิ้น
              </p>
            </div>
            <a href="/borrow" className="bw-btn bw-btn-primary">ยืมของเพิ่ม</a>
          </header>

          {/* ── Standing ───────────────────────────────────────────────── */}
          {suspended && (
            <div className="bw-panel !border-[var(--c-danger-line)] !bg-[var(--c-danger-soft)] mb-5">
              <p className="text-[13.5px] font-semibold text-[var(--c-danger)]">สิทธิ์การยืมถูกระงับ</p>
              <p className="text-[12.5px] text-[var(--c-danger)] mt-1 leading-[1.9]">
                คุณมีอุปกรณ์ที่ยังไม่ได้คืนเกินกำหนด — ไม่มีค่าปรับ
                แต่จะยืมชิ้นใหม่ไม่ได้จนกว่าจะคืนของที่ค้างอยู่
              </p>
            </div>
          )}

          {!suspended && tier === "RESTRICTED" && (
            <div className="bw-panel !border-[var(--c-warn-line)] !bg-[var(--c-warn-soft)] mb-5">
              <p className="text-[12.5px] text-[var(--c-warn)] leading-[1.9]">
                ประวัติการยืมของคุณถูกทำเครื่องหมายว่าต้องระวัง
                เจ้าหน้าที่อาจใช้เวลาพิจารณาคำขอนานขึ้น — คืนของตรงเวลาสองสามครั้งก็กลับมาปกติ
              </p>
            </div>
          )}

          {!suspended && soonest !== undefined && soonest <= 3 && (
            <div className={`bw-panel mb-5 !py-3.5 ${soonest < 0 ? "!border-[var(--c-danger-line)] !bg-[var(--c-danger-soft)]" : "!border-[var(--c-warn-line)] !bg-[var(--c-warn-soft)]"}`}>
              <p className={`text-[13px] ${soonest < 0 ? "text-[var(--c-danger)]" : "text-[var(--c-warn)]"}`}>
                {soonest < 0
                  ? `⚠️ คุณมีของเลยกำหนดคืนมา ${Math.abs(soonest)} วันแล้ว`
                  : soonest === 0
                  ? "⏰ มีของครบกำหนดคืนวันนี้"
                  : `⏰ มีของครบกำหนดคืนในอีก ${soonest} วัน`}
              </p>
            </div>
          )}

          {/* ── Tabs ───────────────────────────────────────────────────── */}
          <div className="flex gap-2 mb-4">
            {TABS.map((t) => {
              const n = t.key === "all" ? orders.length
                : t.key === "done" ? orders.filter((o) => DONE.includes(o.status)).length
                : orders.filter((o) => !DONE.includes(o.status)).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`bw-pill !text-[12.5px] !px-3.5 !py-1.5 ${tab === t.key ? "bw-pill-go" : "bw-pill-done"}`}
                >
                  {t.label} <span className="bw-num opacity-60">{n}</span>
                </button>
              );
            })}
          </div>

          {/* ── List ───────────────────────────────────────────────────── */}
          {shown.length === 0 ? (
            <div className="bw-panel text-center py-16">
              <p className="text-[14px] text-[var(--bw-muted)]">
                {orders.length === 0 ? "คุณยังไม่เคยยืมอะไรเลย" : "ไม่มีรายการในหมวดนี้"}
              </p>
              {orders.length === 0 && (
                <a href="/borrow" className="bw-btn bw-btn-primary mt-4">ดูอุปกรณ์ที่ยืมได้</a>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shown.map((o) => {
                const left = daysLeft(o.dueDate);
                const live = !DONE.includes(o.status);
                return (
                  <a key={o.id} href={`/borrow/orders/${o.id}`} className="bw-panel !p-3.5 flex gap-4 items-center hover:border-[var(--psu-sky-200)] transition-colors group">
                    <div className="bw-thumb w-16 h-16 flex-shrink-0">
                      {o.item.images?.[0]
                        ? <img src={o.item.images[0]} alt="" />
                        : <span className="text-2xl opacity-30">📦</span>}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-[var(--bw-ink)] truncate group-hover:text-[var(--psu-indigo)]">
                          {o.item.title}
                        </p>
                        <span className={`bw-pill ${PILL[o.status] ?? "bw-pill-off"}`}>
                          {BORROW_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[var(--bw-muted)] mt-1">
                        {BORROW_CATEGORY_LABEL[o.item.category] ?? o.item.category}
                        {" · "}ขอยืม {o.requestedDays} วัน
                        {o.office?.name ? ` · ${o.office.name}` : ""}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {live && o.dueDate ? (
                        <>
                          <p className="bw-label">คืนภายใน</p>
                          <p className={`text-[13px] font-semibold mt-0.5 ${left !== null && left < 0 ? "text-[var(--c-danger)]" : ""}`}>
                            {new Date(o.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                          </p>
                          <p className={`text-[11px] ${left !== null && left < 0 ? "text-[var(--c-danger)]" : "text-[var(--bw-muted)]"}`}>
                            {left === null ? "" : left < 0 ? `เลย ${Math.abs(left)} วัน` : left === 0 ? "วันนี้" : `อีก ${left} วัน`}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11.5px] text-[var(--bw-muted)]">
                          {new Date(o.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
