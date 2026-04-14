// Server Component — no "use client"
import { getAdminDashboardStats } from "./actions";
import KpiCard            from "./_components/KpiCard";
import SalesChart         from "./_components/SalesChart";
import StatusPieChart     from "./_components/StatusPieChart";
import RecentOrdersTable  from "./_components/RecentOrdersTable";
import RefreshButton      from "./_components/RefreshButton";

// KPI icon helpers — inline SVGs keep this file self-contained
function UsersIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function PackageIcon()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>; }
function CartIcon()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }
function BanknoteIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }

function fmt(n: number)      { return new Intl.NumberFormat("th-TH").format(n); }
function baht(n: number)     { return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n); }

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#111] tracking-tight">
            แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <p className="text-sm text-[#9a9590] mt-0.5">ภาพรวมแพลตฟอร์ม PSU.STORE</p>
        </div>
        <RefreshButton />
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="ผู้ใช้ทั้งหมด"
          value={fmt(stats.totalUsers)}
          sublabel="นักศึกษาที่ลงทะเบียน"
          accent="bg-blue-100 text-blue-600"
          icon={<UsersIcon />}
        />
        <KpiCard
          label="สินค้าทั้งหมด"
          value={fmt(stats.totalItems)}
          sublabel="ไม่รวมที่ถูกนำออก"
          accent="bg-amber-100 text-amber-600"
          icon={<PackageIcon />}
        />
        <KpiCard
          label="ยอดขายสำเร็จ"
          value={fmt(stats.totalCompletedSales)}
          sublabel="คำสั่งซื้อที่เสร็จสิ้น"
          accent="bg-green-100 text-green-600"
          icon={<CartIcon />}
        />
        <KpiCard
          label="รายได้รวม"
          value={baht(stats.totalRevenue)}
          sublabel="Escrow ที่โอนให้ผู้ขายแล้ว"
          accent="bg-purple-100 text-purple-600"
          icon={<BanknoteIcon />}
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sales bar+line chart — wider (3/5) */}
        <div className="lg:col-span-3">
          <SalesChart data={stats.salesOverTime} />
        </div>
        {/* Status donut chart — narrower (2/5) */}
        <div className="lg:col-span-2">
          <StatusPieChart data={stats.itemStatusCounts} />
        </div>
      </div>

      {/* ── Recent orders table ─────────────────────────────────────────── */}
      <RecentOrdersTable orders={stats.recentOrders} />
    </div>
  );
}
