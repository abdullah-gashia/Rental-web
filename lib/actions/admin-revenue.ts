"use server";

import { auth }   from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RevenueStats = {
  platformFeeTotal:   number;   // all-time from completed orders
  platformFeeToday:   number;
  platformFeeWeek:    number;
  platformFeeMonth:   number;
  pendingPlatformFee: number;   // in-progress orders (held, not yet earned)
  dailyRevenue:       { date: string; fee: number; orders: number }[];
};

// ─── Helper: start of a calendar day (UTC midnight) ──────────────────────────

function startOf(offsetDays: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
}

// ─── Helper: last N days as "YYYY-MM-DD" strings (oldest → newest) ───────────

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

// ─── Active order statuses (funds are held, fee not yet earned) ───────────────

const ACTIVE_STATUSES = [
  "FUNDS_HELD",
  "SHIPPED",
  "MEETUP_SCHEDULED",
  "DISPUTED",
  "AWAITING_SHIPMENT",
  "COD_SHIPPED",
  "MEETUP_ARRANGED",
  "PENDING_CONFIRMATION",
] as const;

// ─── Main action ──────────────────────────────────────────────────────────────

export async function getAdminRevenueStats(): Promise<RevenueStats> {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const todayStart  = startOf(0);
  const weekStart   = startOf(6);   // last 7 days (today + 6 before)
  const monthStart  = startOf(29);  // last 30 days

  const [
    totalAgg,
    todayAgg,
    weekAgg,
    monthAgg,
    pendingAgg,
    recentCompleted,
  ] = await Promise.all([
    // All-time
    prisma.escrowOrder.aggregate({
      where: { status: "COMPLETED" },
      _sum:  { platformFee: true },
    }),
    // Today
    prisma.escrowOrder.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: todayStart } },
      _sum:  { platformFee: true },
    }),
    // Last 7 days
    prisma.escrowOrder.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: weekStart } },
      _sum:  { platformFee: true },
    }),
    // Last 30 days
    prisma.escrowOrder.aggregate({
      where: { status: "COMPLETED", updatedAt: { gte: monthStart } },
      _sum:  { platformFee: true },
    }),
    // Pending (in-progress orders, fee not yet realised)
    prisma.escrowOrder.aggregate({
      where: { status: { in: [...ACTIVE_STATUSES] } },
      _sum:  { platformFee: true },
    }),
    // Last 14 days of completed orders for the bar chart
    prisma.escrowOrder.findMany({
      where: {
        status:    "COMPLETED",
        updatedAt: { gte: startOf(13) },
      },
      select: { platformFee: true, updatedAt: true },
    }),
  ]);

  // ── Build daily chart ───────────────────────────────────────────────────

  const days   = lastNDays(14);
  const dayMap = new Map<string, { fee: number; orders: number }>();

  for (const o of recentCompleted) {
    const date = o.updatedAt.toISOString().split("T")[0];
    const cur  = dayMap.get(date) ?? { fee: 0, orders: 0 };
    dayMap.set(date, { fee: cur.fee + o.platformFee, orders: cur.orders + 1 });
  }

  const dailyRevenue = days.map((date) => ({
    date,
    ...(dayMap.get(date) ?? { fee: 0, orders: 0 }),
  }));

  return {
    platformFeeTotal:   totalAgg._sum.platformFee   ?? 0,
    platformFeeToday:   todayAgg._sum.platformFee   ?? 0,
    platformFeeWeek:    weekAgg._sum.platformFee    ?? 0,
    platformFeeMonth:   monthAgg._sum.platformFee   ?? 0,
    pendingPlatformFee: pendingAgg._sum.platformFee ?? 0,
    dailyRevenue,
  };
}
