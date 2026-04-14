"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Return type ─────────────────────────────────────────────────────────────

export type DashboardStats = {
  totalUsers:          number;
  totalItems:          number;
  totalCompletedSales: number;
  totalRevenue:        number;           // sum of EscrowOrder.amount where COMPLETED
  itemStatusCounts:    { status: string; count: number }[];
  salesOverTime:       { date: string; sales: number; revenue: number }[];
  recentOrders: {
    id:         string;
    amount:     number;
    status:     string;
    createdAt:  string;                  // ISO string — Dates don't cross the RSC boundary
  }[];
};

// ─── Helper: last N calendar days as "YYYY-MM-DD" strings ────────────────────

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  // Auth guard — must be ADMIN
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Run all independent queries in parallel to avoid waterfall latency
  const [
    totalUsers,
    totalItems,
    totalCompletedSales,
    revenueAgg,
    itemStatusGroups,
    recentCompletedOrders,
    recentOrdersRaw,
  ] = await Promise.all([
    // Count all registered users (including admins)
    prisma.user.count(),

    // Count all items that haven't been hard-removed
    prisma.item.count({ where: { status: { not: "UNAVAILABLE" } } }),

    // Completed escrow transactions
    prisma.escrowOrder.count({ where: { status: "COMPLETED" } }),

    // Revenue: sum of escrow amounts for completed orders
    prisma.escrowOrder.aggregate({
      where: { status: "COMPLETED" },
      _sum:  { amount: true },
    }),

    // Item breakdown by status
    prisma.item.groupBy({
      by:     ["status"],
      _count: { _all: true },
    }),

    // Completed orders from last 7 days — used to build the daily sales chart.
    // We use updatedAt as the proxy for completion date (it's stamped when
    // status transitions to COMPLETED).
    prisma.escrowOrder.findMany({
      where: {
        status:    "COMPLETED",
        updatedAt: { gte: sevenDaysAgo },
      },
      select: { amount: true, updatedAt: true },
    }),

    // 5 most-recent orders of any status (for the table)
    prisma.escrowOrder.findMany({
      take:    5,
      orderBy: { createdAt: "desc" },
      select:  { id: true, amount: true, status: true, createdAt: true },
    }),
  ]);

  // ── Build daily sales chart data ─────────────────────────────────────────

  const salesMap = new Map<string, { sales: number; revenue: number }>();
  for (const o of recentCompletedOrders) {
    const date = o.updatedAt.toISOString().split("T")[0];
    const cur  = salesMap.get(date) ?? { sales: 0, revenue: 0 };
    salesMap.set(date, { sales: cur.sales + 1, revenue: cur.revenue + o.amount });
  }

  const days = lastNDays(7);
  let salesOverTime = days.map((date) => ({
    date,
    ...(salesMap.get(date) ?? { sales: 0, revenue: 0 }),
  }));

  // ── Dummy fallback — remove when real completed orders exist ─────────────
  // Provides realistic-looking data so the chart never renders empty on a
  // fresh / test database.
  if (!salesOverTime.some((d) => d.sales > 0)) {
    salesOverTime = days.map((date, i) => ({
      date,
      sales:   [2, 5, 3, 8, 4, 7, 6][i],
      revenue: [1_200, 3_500, 2_100, 5_800, 2_900, 4_700, 3_900][i],
    }));
  }

  return {
    totalUsers,
    totalItems,
    totalCompletedSales,
    totalRevenue: revenueAgg._sum.amount ?? 0,
    itemStatusCounts: itemStatusGroups.map((g) => ({
      status: g.status,
      count:  g._count._all,
    })),
    salesOverTime,
    recentOrders: recentOrdersRaw.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}
