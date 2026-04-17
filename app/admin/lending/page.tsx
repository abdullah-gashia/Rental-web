import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "ระบบปล่อยเช่า | Admin" };

const STATUS_LABEL: Record<string, string> = {
  REQUESTED:                "รอตอบรับ",
  APPROVED:                 "ตอบรับแล้ว",
  DEPOSIT_HELD:             "กักเงินแล้ว",
  REJECTED:                 "ถูกปฏิเสธ",
  EXPIRED:                  "หมดอายุ",
  CANCELLED:                "ยกเลิก",
  PICKUP_SCHEDULED:         "นัดรับแล้ว",
  HANDED_OVER:              "ส่งมอบแล้ว",
  ACTIVE:                   "กำลังเช่า",
  OVERDUE:                  "เกินกำหนด",
  RENEWAL_REQUESTED:        "ขอต่ออายุ",
  RETURN_SCHEDULED:         "นัดคืนแล้ว",
  RETURNED:                 "คืนแล้ว",
  COMPLETED:                "เสร็จสิ้น",
  COMPLETED_WITH_DEDUCTION: "เสร็จ(หักค่าเสียหาย)",
  DISPUTED:                 "มีข้อพิพาท",
  ITEM_LOST:                "ของสูญหาย",
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED:                "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED:                 "bg-blue-50 text-blue-700 border-blue-200",
  DEPOSIT_HELD:             "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED:                 "bg-gray-50 text-gray-600 border-gray-200",
  EXPIRED:                  "bg-gray-50 text-gray-600 border-gray-200",
  CANCELLED:                "bg-gray-50 text-gray-600 border-gray-200",
  PICKUP_SCHEDULED:         "bg-purple-50 text-purple-700 border-purple-200",
  HANDED_OVER:              "bg-purple-50 text-purple-700 border-purple-200",
  ACTIVE:                   "bg-green-50 text-green-700 border-green-200",
  OVERDUE:                  "bg-red-50 text-red-700 border-red-200",
  RETURN_SCHEDULED:         "bg-orange-50 text-orange-700 border-orange-200",
  RETURNED:                 "bg-teal-50 text-teal-700 border-teal-200",
  COMPLETED:                "bg-green-50 text-green-700 border-green-200",
  COMPLETED_WITH_DEDUCTION: "bg-amber-50 text-amber-700 border-amber-200",
  DISPUTED:                 "bg-red-50 text-red-700 border-red-200",
  ITEM_LOST:                "bg-red-100 text-red-800 border-red-300",
};

export default async function AdminLendingPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/");

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
    // Recent 20 orders
    prisma.rentalOrder.findMany({
      take: 20,
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
        <h1 className="text-xl font-bold text-[#111] flex items-center gap-2">
          🔑 ระบบปล่อยเช่า
        </h1>
        <p className="text-sm text-[#9a9590] mt-1">ภาพรวม Rental System — สินค้าเช่าในตลาด</p>
      </div>

      {/* KPI — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "รายการเช่าทั้งหมด",  value: totalRentalItems, color: "text-blue-600"  },
          { label: "คำสั่งเช่าทั้งหมด",  value: totalOrders,      color: "text-[#111]"   },
          { label: "กำลังดำเนินการ",      value: activeOrders,     color: "text-green-600"},
          { label: "เกินกำหนดคืน",        value: overdueOrders,    color: "text-red-600"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#e5e3de] p-4">
            <p className="text-xs text-[#9a9590] mb-1">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* KPI — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "รอเจ้าของอนุมัติ",    value: pendingApprovals,                      color: "text-amber-600" },
          { label: "มัดจำค้างในระบบ",      value: `฿${depositsHeld.toLocaleString()}`,   color: "text-purple-600"},
          { label: "ค่าธรรมเนียมสะสม",    value: `฿${totalRevenue.toLocaleString()}`,   color: "text-emerald-600"},
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#e5e3de] p-4">
            <p className="text-xs text-[#9a9590] mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
        <h2 className="text-sm font-bold text-[#333] mb-4">คำสั่งเช่าล่าสุด</h2>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-[#aaa] text-sm">ยังไม่มีคำสั่งเช่า</div>
        ) : (
          <div className="space-y-1">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#faf9f7] transition">
                <div className="w-10 h-10 rounded-xl bg-[#f0ede7] flex items-center justify-center text-xl flex-shrink-0">
                  {order.item.emoji ?? "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111] truncate">{order.item.title}</p>
                  <p className="text-xs text-[#999]">
                    {order.renter.name ?? "—"} → {order.owner.name ?? "—"}
                    {" · "}฿{order.dailyRate}/วัน × {order.rentalDays} วัน
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  STATUS_COLOR[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
                <Link
                  href={`/rental/orders/${order.id}`}
                  className="text-xs text-[#e8500a] hover:underline flex-shrink-0"
                  target="_blank"
                >
                  ดู →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/rental"
          target="_blank"
          className="px-4 py-2.5 border border-[#e5e3de] text-sm text-[#555] rounded-xl hover:bg-[#f0ede7] transition"
        >
          🔗 เปิดหน้าสินค้าเช่าสาธารณะ
        </Link>
        <Link
          href="/dashboard/rentals"
          target="_blank"
          className="px-4 py-2.5 border border-[#e5e3de] text-sm text-[#555] rounded-xl hover:bg-[#f0ede7] transition"
        >
          📋 แดชบอร์ดการเช่า
        </Link>
      </div>
    </div>
  );
}
