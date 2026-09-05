// Server Component — no "use client"
import { prisma }                 from "@/lib/prisma";
import { getAdminDashboardStats } from "./actions";
import { getAdminRevenueStats }   from "@/lib/actions/admin-revenue";
import SalesChart         from "./_components/SalesChart";
import StatusPieChart     from "./_components/StatusPieChart";
import RecentOrdersTable  from "./_components/RecentOrdersTable";
import RefreshButton      from "./_components/RefreshButton";
import RevenueChart       from "./_components/RevenueChart";
import MoneyValue         from "./_components/MoneyValue";

/**
 * The admin's first screen.
 *
 * It used to open with eight identical KPI tiles in two rows, each with its own
 * pastel icon chip — blue, amber, green, purple, violet, indigo. Eight things
 * shouting equally is the same as nothing shouting, and none of them was
 * actionable. The order here is deliberate: what needs a decision, then the
 * money, then the size of the place.
 */

const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);

export default async function AdminDashboardPage() {
  const [stats, revenue, pendingItems, pendingKyc, openDisputes, openReports, waitingRentals, waitingBorrows] =
    await Promise.all([
      getAdminDashboardStats(),
      getAdminRevenueStats(),
      prisma.item.count({ where: { status: "PENDING" } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.dispute.count({ where: { status: "OPEN" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.rentalOrder.count({ where: { status: "REQUESTED" } }),
      prisma.lendingOrder.count({ where: { status: "REQUESTED" } }),
    ]);

  const queues = [
    { n: pendingItems,   label: "ประกาศรอตรวจสอบ",     href: "/admin/approvals",     bad: false },
    { n: pendingKyc,     label: "คำขอยืนยันตัวตน",       href: "/admin/verifications", bad: false },
    { n: openDisputes,   label: "ข้อพิพาทที่ยังไม่ปิด",   href: "/admin/disputes",      bad: true  },
    { n: openReports,    label: "รายงานผู้ใช้ที่ยังไม่อ่าน", href: "/admin/users",         bad: true  },
    { n: waitingRentals, label: "คำขอเช่ารอเจ้าของตอบ",  href: "/admin/lending?f=waiting", bad: false },
    { n: waitingBorrows, label: "คำขอยืมรองานภัทร",     href: "/pattara/requests",    bad: false },
  ];
  const live = queues.filter((q) => q.n > 0);
  const totalWaiting = live.reduce((s, q) => s + q.n, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="ui-head">
        <div>
          <p className="ui-eyebrow mb-1.5">แผงผู้ดูแลระบบ</p>
          <h1>ภาพรวมแพลตฟอร์ม</h1>
          <p>
            {totalWaiting === 0
              ? "ไม่มีงานค้างในคิวใด ๆ ตอนนี้"
              : `มี ${totalWaiting} รายการรอการตัดสินใจจากผู้ดูแล`}
          </p>
        </div>
        <RefreshButton />
      </header>

      {/* ── 1. What needs a person ───────────────────────────────────────── */}
      {live.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {live.map((q) => (
            <a key={q.href} href={q.href} className={`ui-stat ${q.bad ? "is-bad" : "is-warn"}`}>
              <p className="ui-stat-v !text-[24px]">{q.n}</p>
              <p className="ui-stat-k mt-1 leading-snug">{q.label}</p>
            </a>
          ))}
        </section>
      )}

      {/* ── 2. The money ─────────────────────────────────────────────────── */}
      <section className="ui-card overflow-hidden">
        <div className="ui-card-head">
          <h2>ค่าธรรมเนียมที่แพลตฟอร์มเก็บได้</h2>
          <a href="/admin/fund" className="text-[12.5px] font-semibold text-[var(--psu-blue)] hover:underline">
            ดูกองทุนงานภัทร →
          </a>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--hp-border)]">
          {[
            { k: "ทั้งหมดตั้งแต่เริ่ม", v: revenue.platformFeeTotal,   s: "เข้ากองทุนงานภัทร 100%" },
            { k: "30 วันที่ผ่านมา",     v: revenue.platformFeeMonth,   s: "รอบเดือนล่าสุด" },
            { k: "7 วันที่ผ่านมา",      v: revenue.platformFeeWeek,    s: "รอบสัปดาห์ล่าสุด" },
            { k: "ยังไม่รับรู้",        v: revenue.pendingPlatformFee, s: "อยู่ในคำสั่งซื้อที่ยังไม่จบ" },
          ].map((c) => (
            <div key={c.k} className="px-5 py-4">
              <p className="ui-stat-k">{c.k}</p>
              <p className="ui-stat-v !text-[22px]"><MoneyValue amount={c.v} /></p>
              <p className="ui-stat-sub">{c.s}</p>
            </div>
          ))}
        </div>
      </section>

      <RevenueChart data={revenue.dailyRevenue} />

      {/* ── 3. How big the place is ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <a href="/admin/users" className="ui-stat">
          <p className="ui-stat-k">ผู้ใช้ทั้งหมด</p>
          <p className="ui-stat-v">{fmt(stats.totalUsers)}</p>
          <p className="ui-stat-sub">บัญชีที่ลงทะเบียน</p>
        </a>
        <a href="/admin/items" className="ui-stat">
          <p className="ui-stat-k">สินค้าทั้งหมด</p>
          <p className="ui-stat-v">{fmt(stats.totalItems)}</p>
          <p className="ui-stat-sub">ไม่รวมที่ถูกนำออก</p>
        </a>
        <a href="/admin/orders" className="ui-stat">
          <p className="ui-stat-k">ขายสำเร็จ</p>
          <p className="ui-stat-v">{fmt(stats.totalCompletedSales)}</p>
          <p className="ui-stat-sub">คำสั่งซื้อที่เสร็จสิ้น</p>
        </a>
        <div className="ui-stat">
          <p className="ui-stat-k">มูลค่าที่โอนให้ผู้ขาย</p>
          <p className="ui-stat-v"><MoneyValue amount={stats.totalRevenue} /></p>
          <p className="ui-stat-sub">ปล่อยออกจาก Escrow แล้ว</p>
        </div>
      </section>

      {/* ── 4. Trends ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SalesChart data={stats.salesOverTime} />
        </div>
        <div className="lg:col-span-2">
          <StatusPieChart data={stats.itemStatusCounts} />
        </div>
      </div>

      <RecentOrdersTable orders={stats.recentOrders} />
    </div>
  );
}
