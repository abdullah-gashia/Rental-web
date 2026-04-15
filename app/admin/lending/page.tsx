import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, LENDING_CATEGORY_EMOJI } from "@/lib/constants/lending";

export const dynamic = "force-dynamic";
export const metadata = { title: "ระบบปล่อยเช่า | Admin" };

export default async function AdminLendingPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/");

  const [totalItems, totalOrders, activeOrders, overdueOrders, recentOrders] = await Promise.all([
    prisma.lendingItem.count(),
    prisma.lendingOrder.count(),
    prisma.lendingOrder.count({ where: { status: { in: ["ACTIVE", "OVERDUE"] } } }),
    prisma.lendingOrder.count({ where: { status: "OVERDUE" } }),
    prisma.lendingOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        lendingItem: { select: { id: true, title: true, category: true, images: true } },
        borrower: { select: { id: true, name: true } },
        lender: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111] flex items-center gap-2">
          🔑 ระบบปล่อยเช่า
        </h1>
        <p className="text-sm text-[#9a9590] mt-1">ภาพรวม P2P Lending System</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "รายการทั้งหมด", value: totalItems, color: "text-blue-600" },
          { label: "คำสั่งทั้งหมด", value: totalOrders, color: "text-[#111]" },
          { label: "กำลังดำเนินการ", value: activeOrders, color: "text-green-600" },
          { label: "เกินกำหนด", value: overdueOrders, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#e5e3de] p-4">
            <p className="text-xs text-[#9a9590] mb-1">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
        <h2 className="text-sm font-bold text-[#333] mb-4">คำสั่งล่าสุด</h2>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-[#aaa] text-sm">ยังไม่มีคำสั่ง</div>
        ) : (
          <div className="space-y-1">
            {recentOrders.map((order) => {
              const item = order.lendingItem;
              const emoji = LENDING_CATEGORY_EMOJI[item.category] ?? "📦";

              return (
                <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#faf9f7] transition">
                  <div className="w-10 h-10 rounded-xl bg-[#f0ede7] flex items-center justify-center text-xl flex-shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111] truncate">{item.title}</p>
                    <p className="text-xs text-[#999]">
                      {order.borrower.name ?? "—"} → {order.lender.name ?? "—"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    ORDER_STATUS_COLOR[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
                  }`}>
                    {ORDER_STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <Link
                    href={`/lending/orders/${order.id}`}
                    className="text-xs text-[#e8500a] hover:underline flex-shrink-0"
                    target="_blank"
                  >
                    ดู →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/lending"
          target="_blank"
          className="px-4 py-2.5 border border-[#e5e3de] text-sm text-[#555] rounded-xl hover:bg-[#f0ede7] transition"
        >
          🔗 เปิดหน้าปล่อยเช่าสาธารณะ
        </Link>
      </div>
    </div>
  );
}
