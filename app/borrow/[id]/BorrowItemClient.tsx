"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import SideRail from "@/components/layout/SideRail";
import Footer from "@/components/layout/Footer";
import { useModalStore } from "@/lib/stores/modal-store";
import { requestBorrow } from "@/lib/actions/borrow-orders";
import {
  BORROW_CATEGORY_LABEL, CONDITION_LABEL, ITEM_STATUS_LABEL,
  MAX_CONCURRENT_BORROWS,
} from "@/lib/borrow-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function BorrowItemClient({ item }: { item: any }) {
  const tr = useLocaleStore((s) => s.tr);
  const router    = useRouter();
  const openModal = useModalStore((s) => s.open);

  const [shot, setShot]       = useState(0);
  const [days, setDays]       = useState(Math.min(7, item.maxLendingDays));
  const [purpose, setPurpose] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);
  const [pending, startTransition] = useTransition();

  const office    = item.owner;
  const available = item.status === "AVAILABLE";
  const canAsk    = item.signedIn && item.viewerRole === "STUDENT";

  const due = new Date(Date.now() + days * 86_400_000);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await requestBorrow({ itemId: item.id, days, purposeNote: purpose });
      if (res.success) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="bw-root">
      <Navbar
        searchQuery=""
        onSearchChange={() => {}}
        searchPlaceholder={tr("ค้นหาอุปกรณ์ให้ยืม…")}
        hideCategories
        activeCat="borrow"
        onCatChange={(c) => router.push(c === "all" ? "/" : `/?cat=${c}`)}
      />
      <SideRail activeCat="borrow" onCatChange={(c) => router.push(c === "all" ? "/" : `/?cat=${c}`)} />

      <div className="md:pl-[68px]">
        <main className="max-w-[1080px] mx-auto px-3 sm:px-5 pt-6 pb-20">

          <a href="/borrow" className="text-[12.5px] text-[var(--bw-muted)] hover:text-[var(--psu-navy)] transition">{tr("← อุปกรณ์ให้ยืมทั้งหมด")}</a>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 mt-4">

            {/* ── Left: the object ─────────────────────────────────────── */}
            <div className="flex flex-col gap-5">
              <div className="bw-thumb aspect-[4/3] max-h-[420px]">
                {item.images[shot]
                  ? <img src={item.images[shot]} alt={item.title} />
                  : <span className="text-6xl opacity-25">📦</span>}
              </div>

              {item.images.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {item.images.map((src: string, i: number) => (
                    <button
                      key={src}
                      onClick={() => setShot(i)}
                      className={`bw-thumb w-16 h-16 ${i === shot ? "!border-[var(--psu-blue)] ring-2 ring-[var(--psu-blue)]/20" : ""}`}
                      aria-label={tr("รูปที่ {0}", [i + 1])}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="bw-label">{tr(BORROW_CATEGORY_LABEL[item.category] ?? item.category)}</p>
                    <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] leading-tight mt-1">
                      {item.title}
                    </h1>
                  </div>
                  <span className={`bw-pill ${available ? "bw-pill-live" : "bw-pill-off"} !text-[12px] !px-3 !py-1.5`}>
                    {tr(ITEM_STATUS_LABEL[item.status] ?? item.status)}
                  </span>
                </div>

                {item.description && (
                  <p className="text-[14px] text-[var(--bw-ink-2)] leading-[1.95] mt-3 whitespace-pre-wrap">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="bw-panel">
                <h2 className="bw-h">{tr("รายละเอียด")}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
                  {[
                    [tr("สภาพ"),          tr(CONDITION_LABEL[item.condition] ?? item.condition)],
                    [tr("ยืมได้นานสุด"),   tr("{0} วัน", [item.maxLendingDays])],
                    [tr("ยืมขั้นต่ำ"),     tr("{0} วัน", [item.minLendingDays])],
                    [tr("ต่ออายุ"),        item.isRenewable ? tr("ได้ {0} ครั้ง", [item.maxRenewals]) : tr("ไม่ได้")],
                    [tr("รหัสครุภัณฑ์"),   item.assetTag ?? "—"],
                    [tr("ให้ยืมมาแล้ว"),   tr("{0} ครั้ง", [item.totalLentCount])],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="bw-label">{k}</dt>
                      <dd className="text-[13.5px] font-medium mt-1">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="bw-panel">
                <h2 className="bw-h">{tr("ผู้ให้ยืม")}</h2>
                <p className="text-[14px] font-semibold text-[var(--psu-navy)]">
                  {office.officeName ?? office.name ?? "งานภัทร"}
                </p>
                {office.officeDescription && (
                  <p className="text-[13px] text-[var(--bw-ink-2)] leading-[1.9] mt-1.5">
                    {office.officeDescription}
                  </p>
                )}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--bw-line)]">
                  <div>
                    <dt className="bw-label">{tr("จุดรับ–คืนของ")}</dt>
                    <dd className="text-[13px] mt-1">{office.officeLocation ?? tr("ติดต่อเจ้าหน้าที่")}</dd>
                  </div>
                  <div>
                    <dt className="bw-label">{tr("เวลาทำการ")}</dt>
                    <dd className="text-[13px] mt-1">{office.officeHours ?? tr("ติดต่อเจ้าหน้าที่")}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* ── Right: asking for it ─────────────────────────────────── */}
            <aside className="lg:sticky lg:top-[64px] h-fit">
              <div className="bw-panel">
                <p className="text-[20px] font-semibold text-[var(--psu-blue)]">{tr("ยืมฟรี")}</p>
                <p className="text-[12.5px] text-[var(--bw-muted)] mt-0.5 mb-4">{tr("ไม่มีค่ามัดจำ ไม่มีค่าเช่า ไม่มีค่าปรับ")}</p>

                {done ? (
                  <div className="rounded-xl border border-[var(--psu-sky-200)] bg-[var(--bw-tint)] px-4 py-4 text-center">
                    <p className="text-[14px] font-semibold text-[var(--psu-blue-700)]">{tr("ส่งคำขอแล้ว")}</p>
                    <p className="text-[12.5px] text-[var(--bw-ink-2)] mt-1 leading-[1.8]">{tr("เจ้าหน้าที่จะตรวจสอบและแจ้งผลทางอีเมล")}</p>
                    <a href="/dashboard/borrows" className="bw-btn bw-btn-primary w-full mt-3">{tr("ดูสถานะคำขอ")}</a>
                  </div>
                ) : item.alreadyRequested ? (
                  <div className="rounded-xl border border-[var(--bw-line-2)] bg-[var(--bw-ground)] px-4 py-4 text-center">
                    <p className="text-[13.5px] font-medium">{tr("คุณมีคำขอสำหรับชิ้นนี้อยู่แล้ว")}</p>
                    <a href="/dashboard/borrows" className="bw-btn bw-btn-ghost w-full mt-3">{tr("ดูสถานะ")}</a>
                  </div>
                ) : !available ? (
                  <div className="rounded-xl border border-[var(--bw-line-2)] bg-[var(--bw-ground)] px-4 py-5 text-center">
                    <p className="text-[13.5px] font-medium text-[var(--bw-ink-2)]">{tr("ตอนนี้มีคนยืมอยู่")}</p>
                    <p className="text-[12px] text-[var(--bw-muted)] mt-1 leading-[1.8]">{tr("ยังไม่มีระบบจองคิว ลองกลับมาดูใหม่อีกครั้ง")}</p>
                  </div>
                ) : !item.signedIn ? (
                  <button onClick={() => openModal("login")} className="bw-btn bw-btn-primary w-full">{tr("เข้าสู่ระบบเพื่อขอยืม")}</button>
                ) : !canAsk ? (
                  <div className="rounded-xl border border-[var(--bw-line-2)] bg-[var(--bw-ground)] px-4 py-4 text-[12.5px] text-[var(--bw-ink-2)] leading-[1.8]">{tr("บัญชีนี้เป็นบัญชีเจ้าหน้าที่ ไม่สามารถยืมอุปกรณ์ได้")}</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label htmlFor="days" className="bw-label block mb-2">{tr("ยืมกี่วัน")}</label>
                      <div className="flex items-center gap-3">
                        <input
                          id="days"
                          type="range"
                          min={item.minLendingDays}
                          max={item.maxLendingDays}
                          value={days}
                          onChange={(e) => setDays(Number(e.target.value))}
                          className="flex-1 accent-[var(--psu-blue)]"
                        />
                        <span className="bw-num text-[15px] font-semibold w-16 text-right">
                          {days} วัน
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[var(--bw-muted)] mt-2">
                        ครบกำหนดคืน{" "}
                        <strong className="text-[var(--bw-ink)]">
                          {due.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                        </strong>
                      </p>
                    </div>

                    <div>
                      <label htmlFor="purpose" className="bw-label block mb-2">{tr("จะเอาไปใช้ทำอะไร")}</label>
                      <textarea
                        id="purpose"
                        rows={3}
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value.slice(0, 1000))}
                        placeholder={tr("เช่น ใช้ทำแล็บวิชาฟิสิกส์ สัปดาห์หน้า")}
                        className="bw-input"
                      />
                      <p className="text-[11px] text-[var(--bw-muted)] mt-1.5 leading-[1.7]">{tr("เฉพาะเจ้าหน้าที่งานภัทรเท่านั้นที่เห็นข้อความนี้ ไม่แสดงบนโปรไฟล์ของคุณ")}</p>
                    </div>

                    {error && (
                      <div role="alert" className="text-[12.5px] text-[var(--c-danger)] bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-3.5 py-2.5 leading-[1.7]">
                        {error}
                      </div>
                    )}

                    <button onClick={submit} disabled={pending} className="bw-btn bw-btn-primary w-full">
                      {pending ? "กำลังส่ง…" : tr("ขอยืมชิ้นนี้")}
                    </button>

                    <p className="text-[11.5px] text-[var(--bw-muted)] text-center leading-[1.8]">
                      ยืมพร้อมกันได้สูงสุด {MAX_CONCURRENT_BORROWS} ชิ้น
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
