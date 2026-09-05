import { getOfficeStats, getOfficeOrders } from "@/lib/actions/borrow-orders";
import { getFundSummary } from "@/lib/actions/fund";
import { BORROW_STATUS_LABEL } from "@/lib/borrow-config";

export const dynamic  = "force-dynamic";
export const metadata = { title: "ภาพรวม | งานภัทร" };

const PILL: Record<string, string> = {
  REQUESTED: "bw-pill-wait", RENEWAL_REQUESTED: "bw-pill-wait", RETURN_REQUESTED: "bw-pill-wait",
  APPROVED: "bw-pill-go", PICKUP_SCHEDULED: "bw-pill-go", RETURN_SCHEDULED: "bw-pill-go",
  ITEM_HANDED_OVER: "bw-pill-go", RETURNED: "bw-pill-go",
  ACTIVE: "bw-pill-live", RENEWED: "bw-pill-live",
  OVERDUE: "bw-pill-late", LOST: "bw-pill-late",
  COMPLETED: "bw-pill-done", COMPLETED_WITH_DEDUCTION: "bw-pill-done",
  REJECTED: "bw-pill-off", CANCELLED: "bw-pill-off",
};

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export default async function PattaraOverview() {
  const [stats, recent, fund] = await Promise.all([
    getOfficeStats(),
    getOfficeOrders(),
    getFundSummary(),
  ]);

  const needsAction = recent.filter((o) =>
    ["REQUESTED", "RENEWAL_REQUESTED", "RETURN_REQUESTED", "OVERDUE"].includes(o.status),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)]">ภาพรวม</h1>
        <p className="text-[13px] text-[var(--bw-muted)] mt-1">
          คลังอุปกรณ์ให้ยืมและสถานะการยืมทั้งหมด
        </p>
      </header>

      {/* ── Numbers ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { k: "อุปกรณ์ทั้งหมด", v: stats.items,     href: "/pattara/items" },
          { k: "ว่างให้ยืม",      v: stats.available,  href: "/pattara/items" },
          { k: "ถูกยืมอยู่",       v: stats.lentOut,    href: "/pattara/orders?f=active" },
          { k: "รออนุมัติ",       v: stats.waiting,    href: "/pattara/requests", hot: stats.waiting > 0 },
          { k: "เกินกำหนดคืน",    v: stats.overdue,    href: "/pattara/orders?f=overdue", bad: stats.overdue > 0 },
          { k: "ให้ยืมสำเร็จ",     v: stats.completed,  href: "/pattara/orders?f=done" },
        ].map((s) => (
          <a
            key={s.k}
            href={s.href}
            className={`bw-panel !py-4 hover:border-[var(--psu-sky-200)] transition-colors ${
              s.bad ? "!border-[var(--c-danger-line)] !bg-[var(--c-danger-soft)]" : s.hot ? "!border-[var(--c-warn-line)] !bg-[var(--c-warn-soft)]" : ""
            }`}
          >
            <p className="bw-label">{s.k}</p>
            <p className={`bw-num text-[28px] font-semibold leading-none mt-1.5 ${
              s.bad ? "text-[var(--c-danger)]" : s.hot ? "text-[var(--c-warn)]" : "text-[var(--psu-navy)]"
            }`}>
              {s.v}
            </p>
          </a>
        ))}
      </div>

      {/* ── Fund ─────────────────────────────────────────────────────── */}
      <section className="bw-panel">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[15px] font-semibold text-[var(--psu-navy)]">กองทุน</h2>
          <a href="/pattara/fund" className="text-[12px] font-semibold text-[var(--psu-blue)] hover:underline">
            จัดการ →
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ["ค่าธรรมเนียมที่ได้", baht(fund.incomeTotal + fund.otherIn)],
            ["ใช้ไปแล้ว",         baht(fund.spentTotal)],
            ["คงเหลือ",           baht(fund.balance)],
            ["ซื้ออุปกรณ์แล้ว",     `${fund.itemsBought} ชิ้น`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="bw-label">{k}</p>
              <p className="bw-num text-[17px] font-semibold mt-1">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Needs a decision ─────────────────────────────────────────── */}
      <section className="bw-panel">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[15px] font-semibold text-[var(--psu-navy)]">
            ต้องดำเนินการ
            {needsAction.length > 0 && (
              <span className="ml-2 text-[12px] font-normal text-[var(--bw-muted)]">
                {needsAction.length} รายการ
              </span>
            )}
          </h2>
          <a href="/pattara/orders" className="text-[12px] font-semibold text-[var(--psu-blue)] hover:underline">
            ดูทั้งหมด →
          </a>
        </div>

        {needsAction.length === 0 ? (
          <p className="text-[13px] text-[var(--bw-muted)] py-8 text-center">
            ไม่มีรายการที่รอคุณอยู่ตอนนี้
          </p>
        ) : (
          <div className="flex flex-col">
            {needsAction.slice(0, 8).map((o) => (
              <a
                key={o.id}
                href={`/pattara/orders/${o.id}`}
                className="flex items-center gap-3 py-3 border-b border-[var(--bw-line)] last:border-0 hover:bg-[var(--bw-tint)] -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="bw-thumb w-11 h-11 flex-shrink-0">
                  {o.item.images?.[0]
                    ? <img src={o.item.images[0]} alt="" />
                    : <span className="text-lg opacity-30">📦</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium truncate">{o.item.title}</p>
                  <p className="text-[11.5px] text-[var(--bw-muted)] truncate">
                    {o.borrower?.name ?? "—"}
                    {o.dueDate ? ` · คืน ${new Date(o.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}` : ""}
                  </p>
                </div>
                <span className={`bw-pill ${PILL[o.status] ?? "bw-pill-off"} flex-shrink-0`}>
                  {BORROW_STATUS_LABEL[o.status] ?? o.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
