import { getTr } from "@/lib/i18n/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { statusLabel, statusColor } from "./_lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "ระบบปล่อยเช่า | Admin" };

const FILTERS = [
  { key: "all",       label: "ทั้งหมด",       statuses: null                                              },
  { key: "waiting",   label: "รอตอบรับ",      statuses: ["REQUESTED"]                                     },
  { key: "active",    label: "กำลังเช่า",      statuses: ["APPROVED", "DEPOSIT_HELD", "PICKUP_SCHEDULED",
                                                          "HANDED_OVER", "ACTIVE", "RENEWAL_REQUESTED",
                                                          "RETURN_SCHEDULED", "RETURNED"]                 },
  { key: "overdue",   label: "เกินกำหนด",     statuses: ["OVERDUE", "ITEM_LOST"]                          },
  { key: "disputed",  label: "มีข้อพิพาท",     statuses: ["DISPUTED"]                                      },
  { key: "done",      label: "จบแล้ว",        statuses: ["COMPLETED", "COMPLETED_WITH_DEDUCTION",
                                                          "CANCELLED", "REJECTED", "EXPIRED"]             },
] as const;

export default async function AdminLendingPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const tr = await getTr();
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/");

  const { f } = await searchParams;
  const activeFilter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const listWhere = activeFilter.statuses
    ? { status: { in: [...activeFilter.statuses] as never } }
    : {};

  const ACTIVE_STATUSES = ["REQUESTED", "APPROVED", "DEPOSIT_HELD", "PICKUP_SCHEDULED", "HANDED_OVER", "ACTIVE", "OVERDUE", "RENEWAL_REQUESTED", "RETURN_SCHEDULED"] as const;

  const [
    totalRentalItems,
    totalOrders,
    activeOrders,
    overdueOrders,
    pendingApprovals,
    revenueResult,
    depositsResult,
    recentOrders,
  ] = await Promise.all([
    // Marketplace RENT items
    prisma.item.count({ where: { listingType: "RENT" } }),
    // All rental orders ever
    prisma.rentalOrder.count(),
    // Currently active (in-progress)
    prisma.rentalOrder.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
    // Overdue
    prisma.rentalOrder.count({ where: { status: "OVERDUE" } }),
    // Waiting for owner approval
    prisma.rentalOrder.count({ where: { status: "REQUESTED" } }),
    // Platform revenue from completed rentals
    prisma.rentalOrder.aggregate({
      where: { status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] } },
      _sum: { platformFee: true },
    }),
    // Deposits currently held
    prisma.rentalOrder.aggregate({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      _sum: { securityDeposit: true },
    }),
    // Recent orders for the selected filter
    prisma.rentalOrder.findMany({
      where: listWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        item:   { select: { id: true, title: true, emoji: true } },
        renter: { select: { id: true, name: true } },
        owner:  { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalRevenue   = revenueResult._sum.platformFee     ?? 0;
  const depositsHeld   = depositsResult._sum.securityDeposit ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-ink)] flex items-center gap-2">{tr("🔑 ระบบปล่อยเช่า")}</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">{tr("ภาพรวม Rental System — สินค้าเช่าในตลาด")}</p>
      </div>

      {/* KPI — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: tr("รายการเช่าทั้งหมด"),  value: totalRentalItems, color: "text-[var(--c-accent)]"  },
          { label: tr("คำสั่งเช่าทั้งหมด"),  value: totalOrders,      color: "text-[var(--c-ink)]"   },
          { label: tr("กำลังดำเนินการ"),      value: activeOrders,     color: "text-[var(--c-ok)]"},
          { label: tr("เกินกำหนดคืน"),        value: overdueOrders,    color: "text-[var(--c-danger)]"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-4">
            <p className="text-xs text-[var(--c-muted)] mb-1">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* KPI — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: tr("รอเจ้าของอนุมัติ"),    value: pendingApprovals,                      color: "text-[var(--c-warn)]" },
          { label: tr("มัดจำค้างในระบบ"),      value: `฿${depositsHeld.toLocaleString()}`,   color: "text-purple-600"},
          { label: tr("ค่าธรรมเนียมสะสม"),    value: `฿${totalRevenue.toLocaleString()}`,   color: "text-[var(--c-ok)]"},
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-4">
            <p className="text-xs text-[var(--c-muted)] mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[var(--c-ink-1)]">{tr("คำสั่งเช่าล่าสุด")}</h2>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {FILTERS.map((x) => (
              <Link
                key={x.key}
                href={x.key === "all" ? "/admin/lending" : `/admin/lending?f=${x.key}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                  activeFilter.key === x.key
                    ? "bg-[var(--c-accent)] border-[var(--c-accent)] text-white"
                    : "bg-[var(--c-surface)] border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-line-str)]"
                }`}
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-[var(--c-faint)] text-sm">
            ไม่มีคำสั่งเช่าในหมวด &ldquo;{activeFilter.label}&rdquo;
          </div>
        ) : (
          <div className="space-y-1">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--c-subtle)] transition">
                <div className="w-10 h-10 rounded-xl bg-[var(--c-line-soft)] flex items-center justify-center text-xl flex-shrink-0">
                  {order.item.emoji ?? "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--c-ink)] truncate">{order.item.title}</p>
                  <p className="text-xs text-[var(--c-faint)]">
                    {order.renter.name ?? "—"} → {order.owner.name ?? "—"}
                    {" · "}฿{order.dailyRate}/วัน × {order.rentalDays} วัน
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
                <Link
                  href={`/admin/lending/${order.id}`}
                  className="text-xs font-semibold text-[var(--c-accent)] hover:underline flex-shrink-0"
                >{tr("ดูรายละเอียด →")}</Link>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
