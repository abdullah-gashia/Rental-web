// Server Component — no "use client"
import { getTr } from "@/lib/i18n/server";
import { prisma }                 from "@/lib/prisma";
import { getAdminDashboardStats } from "./actions";
import { getAdminRevenueStats }   from "@/lib/actions/admin-revenue";
import SalesChart         from "./_components/SalesChart";
import StatusPieChart     from "./_components/StatusPieChart";
import RecentOrdersTable  from "./_components/RecentOrdersTable";
import RefreshButton      from "./_components/RefreshButton";
import RevenueChart       from "./_components/RevenueChart";
import MoneyValue         from "./_components/MoneyValue";
import { getI18n } from "@/lib/i18n/server";

/**
 * The admin's first screen.
 *
 * It used to open with eight identical KPI tiles in two rows, each with its own
 * pastel icon chip — blue, amber, green, purple, violet, indigo. Eight things
 * shouting equally is the same as nothing shouting, and none of them was
 * actionable. The order here is deliberate: what needs a decision, then the
 * money, then the size of the place.
 */

const fmt = (n: number, nf: string) => new Intl.NumberFormat(nf).format(n);

export default async function AdminDashboardPage() {
  const tr = await getTr();
  const { locale, t } = await getI18n();
  const nf = locale === "en" ? "en-US" : "th-TH";
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
    { n: pendingItems,   label: t("ad_q_items"),    href: "/admin/approvals",         bad: false },
    { n: pendingKyc,     label: t("ad_q_kyc"),      href: "/admin/verifications",     bad: false },
    { n: openDisputes,   label: t("ad_q_disputes"), href: "/admin/disputes",          bad: true  },
    { n: openReports,    label: t("ad_q_reports"),  href: "/admin/users",             bad: true  },
    { n: waitingRentals, label: t("ad_q_rentals"),  href: "/admin/lending?f=waiting", bad: false },
    { n: waitingBorrows, label: t("ad_q_borrows"),  href: "/pattara/requests",        bad: false },
  ];
  const live = queues.filter((q) => q.n > 0);
  const totalWaiting = live.reduce((s, q) => s + q.n, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="ui-head">
        <div>
          <p className="ui-eyebrow mb-1.5">{t("shell_admin_panel")}</p>
          <h1>{t("ad_platform")}</h1>
          <p>{totalWaiting === 0 ? t("ad_quiet") : t("ad_waiting", { n: totalWaiting })}</p>
        </div>
        <RefreshButton />
      </header>

      {/* ── 1. What needs a person ───────────────────────────────────────── */}
      {live.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {live.map((q) => (
            <a key={q.href} href={q.href} className={`ui-stat ${q.bad ? "is-bad" : "is-warn"}`}>
              <p className="ui-stat-v !text-[24px]">{q.n}</p>
              <p className="ui-stat-k mt-1 leading-snug">{tr(q.label)}</p>
            </a>
          ))}
        </section>
      )}

      {/* ── 2. The money ─────────────────────────────────────────────────── */}
      <section className="ui-card overflow-hidden">
        <div className="ui-card-head">
          <h2>{t("ad_fees")}</h2>
          <a href="/admin/fund" className="text-[12.5px] font-semibold text-[var(--psu-blue)] hover:underline">
            {t("ad_fund_link")} →
          </a>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[var(--hp-border)]">
          {[
            { k: t("ad_fee_total"),   v: revenue.platformFeeTotal,   s: t("ad_fee_total_s") },
            { k: t("ad_fee_month"),   v: revenue.platformFeeMonth,   s: t("ad_fee_month_s") },
            { k: t("ad_fee_week"),    v: revenue.platformFeeWeek,    s: t("ad_fee_week_s") },
            { k: t("ad_fee_pending"), v: revenue.pendingPlatformFee, s: t("ad_fee_pending_s") },
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
          <p className="ui-stat-k">{t("ad_total_users")}</p>
          <p className="ui-stat-v">{fmt(stats.totalUsers, nf)}</p>
          <p className="ui-stat-sub">{t("ad_total_users_s")}</p>
        </a>
        <a href="/admin/items" className="ui-stat">
          <p className="ui-stat-k">{t("ad_total_items")}</p>
          <p className="ui-stat-v">{fmt(stats.totalItems, nf)}</p>
          <p className="ui-stat-sub">{t("ad_total_items_s")}</p>
        </a>
        <a href="/admin/orders" className="ui-stat">
          <p className="ui-stat-k">{t("ad_sales")}</p>
          <p className="ui-stat-v">{fmt(stats.totalCompletedSales, nf)}</p>
          <p className="ui-stat-sub">{t("ad_sales_s")}</p>
        </a>
        <div className="ui-stat">
          <p className="ui-stat-k">{t("ad_payout")}</p>
          <p className="ui-stat-v"><MoneyValue amount={stats.totalRevenue} /></p>
          <p className="ui-stat-sub">{t("ad_payout_s")}</p>
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
