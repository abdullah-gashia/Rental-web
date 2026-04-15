import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyLendingDashboard } from "@/lib/actions/lending-orders";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, LENDING_CATEGORY_EMOJI } from "@/lib/constants/lending";

export const dynamic = "force-dynamic";
export const metadata = { title: "การยืมของฉัน | PSU Store" };

export default async function LendingDashboardPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) redirect("/auth/signin");

  const { borrows, lends } = await getMyLendingDashboard();

  const activeStatuses = ["REQUESTED","APPROVED","DEPOSIT_HELD","PICKUP_SCHEDULED",
    "PICKUP_IN_PROGRESS","ITEM_HANDED_OVER","ACTIVE","OVERDUE","RENEWAL_REQUESTED","RENEWED",
    "RETURN_REQUESTED","RETURN_SCHEDULED","RETURN_IN_PROGRESS"];

  const activeBorrows = borrows.filter((o: any) => activeStatuses.includes(o.status));
  const pastBorrows = borrows.filter((o: any) => !activeStatuses.includes(o.status));
  const activeLends = lends.filter((o: any) => activeStatuses.includes(o.status));
  const pastLends = lends.filter((o: any) => !activeStatuses.includes(o.status));

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-[#111]">🔑 การยืมของฉัน</h1>
            <p className="text-sm text-[#777] mt-0.5">
              ติดตามการยืมและให้ยืมทั้งหมดของคุณ
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/lending/my-items"
              className="px-3.5 py-2 border border-[#e5e3de] text-xs font-medium text-[#555] rounded-xl
                         hover:bg-[#f0ede7] transition"
            >
              📦 รายการของฉัน
            </Link>
            <Link
              href="/lending"
              className="px-3.5 py-2 bg-[#e8500a] text-white text-xs font-bold rounded-xl
                         hover:bg-[#c94208] transition"
            >
              ค้นหาของยืม
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── ฉันเป็นผู้ยืม ── */}
          <section>
            <h2 className="text-sm font-bold text-[#333] mb-3 flex items-center gap-2">
              📥 ฉันเป็นผู้ยืม
              {activeBorrows.length > 0 && (
                <span className="px-2 py-0.5 bg-[#e8500a] text-white text-[10px] font-bold rounded-full">
                  {activeBorrows.length} กำลังดำเนินการ
                </span>
              )}
            </h2>

            {borrows.length === 0 ? (
              <EmptyCard
                msg="ยังไม่มีประวัติการยืม"
                action={{ label: "ค้นหาของยืม", href: "/lending" }}
              />
            ) : (
              <div className="space-y-2">
                {[...activeBorrows, ...pastBorrows].map((order: any) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    role="borrower"
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── ฉันเป็นเจ้าของ ── */}
          <section>
            <h2 className="text-sm font-bold text-[#333] mb-3 flex items-center gap-2">
              📤 ฉันเป็นเจ้าของ
              {activeLends.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {activeLends.length} กำลังดำเนินการ
                </span>
              )}
            </h2>

            {lends.length === 0 ? (
              <EmptyCard
                msg="ยังไม่มีรายการให้ยืม"
                action={{ label: "ลงรายการแรก", href: "/lending/post" }}
              />
            ) : (
              <div className="space-y-2">
                {[...activeLends, ...pastLends].map((order: any) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    role="lender"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Order Row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, role }: { order: any; role: "borrower" | "lender" }) {
  const item = order.lendingItem;
  const counterparty = role === "borrower" ? order.lender : order.borrower;
  const emoji = LENDING_CATEGORY_EMOJI[item.category] ?? "📦";
  const img = item.images?.[0];

  const daysLeft = order.dueDate
    ? Math.ceil((new Date(order.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      href={`/lending/orders/${order.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-[#e5e3de] p-3.5
                 hover:border-[#e8500a]/40 hover:shadow-sm transition group"
    >
      {/* Image */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#f0ede7]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">{emoji}</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111] truncate group-hover:text-[#e8500a] transition">
          {item.title}
        </p>
        <p className="text-xs text-[#999]">
          {role === "borrower" ? "เจ้าของ: " : "ผู้ยืม: "}
          {counterparty?.name ?? "—"}
        </p>

        {/* Due date alert */}
        {order.status === "ACTIVE" && daysLeft !== null && (
          <p className={`text-xs mt-0.5 font-medium ${
            daysLeft < 0 ? "text-red-600" :
            daysLeft <= 1 ? "text-amber-600" : "text-[#777]"
          }`}>
            {daysLeft < 0 ? `⚠️ เกินกำหนด ${Math.abs(daysLeft)} วัน` :
             daysLeft === 0 ? "⏰ ครบกำหนดวันนี้!" :
             `📅 คืนใน ${daysLeft} วัน`}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
        ORDER_STATUS_COLOR[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      }`}>
        {ORDER_STATUS_LABEL[order.status] ?? order.status}
      </span>
    </Link>
  );
}

function EmptyCard({ msg, action }: { msg: string; action: { label: string; href: string } }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-8 text-center">
      <p className="text-2xl mb-2">📭</p>
      <p className="text-sm text-[#777]">{msg}</p>
      <Link
        href={action.href}
        className="mt-3 inline-block px-4 py-2 bg-[#e8500a] text-white text-xs font-bold
                   rounded-xl hover:bg-[#c94208] transition"
      >
        {action.label}
      </Link>
    </div>
  );
}
