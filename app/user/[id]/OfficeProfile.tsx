import { getTr } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import Brand from "@/components/layout/Brand";
import { BORROW_CATEGORY_LABEL, ITEM_STATUS_LABEL } from "@/lib/borrow-config";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The public face of a งานภัทร account.
 *
 * Deliberately not the person profile with a few fields hidden. Stars, trust
 * score and "sales completed" are measures of how someone trades; an office
 * that lends equipment for free is not trading, and publishing those numbers
 * would invite students to compare it against sellers on a scale that does not
 * apply. What matters here is what it has, where it is, and when it is open.
 */
export default async function OfficeProfile({ user }: { user: any }) {
  const tr = await getTr();
  const [items, lentCount, activeCount] = await Promise.all([
    prisma.lendingItem.findMany({
      where: {
        ownerId: user.id,
        status: { in: ["AVAILABLE", "RESERVED", "LENT_OUT"] },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true, title: true, images: true, category: true,
        status: true, maxLendingDays: true,
      },
    }),
    prisma.lendingOrder.count({
      where: { lenderId: user.id, status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] } },
    }),
    prisma.lendingItem.count({ where: { ownerId: user.id, status: "AVAILABLE" } }),
  ]);

  const since = new Date(user.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long" });

  return (
    <div className="bw-root min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--c-surface)] border-b border-[var(--bw-line)]">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Brand size={26} />
          <a href="/borrow" className="text-[13px] font-semibold text-[var(--psu-blue)] hover:underline">{tr("อุปกรณ์ให้ยืมทั้งหมด →")}</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-7 flex flex-col gap-5">

        {/* ── Identity ─────────────────────────────────────────────────── */}
        <section className="bw-panel">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[var(--psu-blue)] flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
              {user.image
                ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M7 11V7a2 2 0 114 0v4m0 0V5.5a2 2 0 114 0V11m0 0V8.5a2 2 0 114 0V15a6 6 0 01-6 6h-2a6 6 0 01-6-6v-3.5a2 2 0 114 0V13" />
                  </svg>
                )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="bw-label">{tr("หน่วยงาน")}</p>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)] leading-tight mt-0.5">
                {user.officeName ?? user.name ?? tr("งานภัทร")}
              </h1>
              <p className="text-[12.5px] text-[var(--bw-muted)] mt-1">
                ให้บริการตั้งแต่ {since}
              </p>
            </div>
          </div>

          {user.officeDescription && (
            <p className="text-[13.5px] text-[var(--bw-ink-2)] leading-[1.95] mt-4 pt-4 border-t border-[var(--bw-line)] whitespace-pre-wrap">
              {user.officeDescription}
            </p>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--bw-line)]">
            <div>
              <dt className="bw-label">{tr("จุดรับ–คืนของ")}</dt>
              <dd className="text-[13px] mt-1">{user.officeLocation ?? tr("ติดต่อเจ้าหน้าที่")}</dd>
            </div>
            <div>
              <dt className="bw-label">{tr("เวลาทำการ")}</dt>
              <dd className="text-[13px] mt-1">{user.officeHours ?? tr("ติดต่อเจ้าหน้าที่")}</dd>
            </div>
          </dl>
        </section>

        {/* ── What it does ─────────────────────────────────────────────── */}
        <section className="bw-panel !p-0 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-[var(--bw-line)]">
            {[
              { k: tr("อุปกรณ์ทั้งหมด"), v: items.length >= 12 ? "12+" : String(items.length) },
              { k: tr("ว่างให้ยืมตอนนี้"), v: String(activeCount) },
              { k: tr("ให้ยืมไปแล้ว"),   v: tr("{0} ครั้ง", [lentCount]) },
            ].map((s) => (
              <div key={s.k} className="px-4 py-4 text-center">
                <p className="bw-num text-[22px] font-semibold text-[var(--psu-navy)] leading-none">{s.v}</p>
                <p className="text-[11px] text-[var(--bw-muted)] mt-1.5">{s.k}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The shelf ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-[15px] font-semibold text-[var(--psu-navy)]">{tr("อุปกรณ์ที่ให้ยืม")}</h2>
            <a href="/borrow" className="text-[12px] font-semibold text-[var(--psu-blue)] hover:underline">{tr("ดูทั้งหมด →")}</a>
          </div>

          {items.length === 0 ? (
            <div className="bw-panel text-center py-12">
              <p className="text-[13.5px] text-[var(--bw-muted)]">{tr("ยังไม่มีอุปกรณ์ให้ยืมในตอนนี้")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((i) => (
                <a key={i.id} href={`/borrow/${i.id}`} className="bw-panel !p-0 overflow-hidden group hover:border-[var(--psu-sky-200)] transition-colors">
                  <div className="bw-thumb aspect-[4/3] !rounded-none !border-0 !border-b border-[var(--bw-line)]">
                    {i.images[0]
                      ? <img src={i.images[0]} alt={i.title} loading="lazy" />
                      : <span className="text-3xl opacity-30">📦</span>}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-medium leading-snug line-clamp-2 group-hover:text-[var(--psu-indigo)]">
                      {i.title}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[11px] text-[var(--bw-muted)]">
                        {tr(BORROW_CATEGORY_LABEL[i.category] ?? i.category)}
                      </span>
                      <span className={`bw-pill ${i.status === "AVAILABLE" ? "bw-pill-live" : "bw-pill-off"}`}>
                        {tr(ITEM_STATUS_LABEL[i.status] ?? i.status)}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ── Where the equipment comes from ───────────────────────────── */}
        <section className="bw-panel">
          <h2 className="bw-h">{tr("อุปกรณ์เหล่านี้มาจากไหน")}</h2>
          <p className="text-[13px] text-[var(--bw-ink-2)] leading-[1.95]">{tr("PSU Store เก็บค่าธรรมเนียม 5% จากการซื้อขายและการเช่าในระบบ เงินทั้งหมดเข้ากองทุนงานภัทรเพื่อซื้ออุปกรณ์ให้นักศึกษายืมฟรี ทุกครั้งที่คุณซื้อของในเว็บนี้ คุณช่วยเติมของเข้าคลังนี้ไปด้วย")}</p>
          <a href="/borrow" className="bw-btn bw-btn-primary mt-4">{tr("ดูอุปกรณ์ที่ยืมได้")}</a>
        </section>

        <p className="text-[11.5px] text-[var(--bw-muted)] text-center leading-[1.8]">{tr("บัญชีหน่วยงานไม่มีคะแนนดาวหรือรีวิว เพราะไม่ได้ซื้อขายกับนักศึกษา")}<br />{tr("หากพบปัญหาการใช้บริการ กรุณาติดต่อผู้ดูแลระบบ")}</p>
      </main>
    </div>
  );
}
