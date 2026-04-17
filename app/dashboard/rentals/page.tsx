import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyRentalOrders } from "@/lib/actions/rental-checkout";

export const dynamic = "force-dynamic";
export const metadata = { title: "การเช่าของฉัน | PSU Store" };

const STATUS_LABEL: Record<string, string> = {
  REQUESTED:                "รอตอบรับ",
  APPROVED:                 "ตอบรับแล้ว",
  PICKUP_SCHEDULED:         "นัดรับแล้ว",
  ACTIVE:                   "กำลังเช่า",
  OVERDUE:                  "เกินกำหนด",
  RETURN_SCHEDULED:         "นัดคืนแล้ว",
  COMPLETED:                "เสร็จสิ้น",
  COMPLETED_WITH_DEDUCTION: "เสร็จ(หักค่าเสียหาย)",
  REJECTED:                 "ถูกปฏิเสธ",
  CANCELLED:                "ยกเลิก",
  EXPIRED:                  "หมดอายุ",
  ITEM_LOST:                "ของสูญหาย",
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED:                "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED:                 "bg-blue-50 text-blue-700 border-blue-200",
  PICKUP_SCHEDULED:         "bg-purple-50 text-purple-700 border-purple-200",
  ACTIVE:                   "bg-green-50 text-green-700 border-green-200",
  OVERDUE:                  "bg-red-50 text-red-700 border-red-200",
  RETURN_SCHEDULED:         "bg-orange-50 text-orange-700 border-orange-200",
  COMPLETED:                "bg-green-50 text-green-700 border-green-200",
  COMPLETED_WITH_DEDUCTION: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED:                 "bg-gray-50 text-gray-600 border-gray-200",
  CANCELLED:                "bg-gray-50 text-gray-600 border-gray-200",
  EXPIRED:                  "bg-gray-50 text-gray-600 border-gray-200",
};

const ACTIVE_STATUSES = ["REQUESTED","APPROVED","PICKUP_SCHEDULED","ACTIVE","OVERDUE","RETURN_SCHEDULED"];

export default async function RentalDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { asRenter, asOwner } = await getMyRentalOrders();

  const activeAsRenter = asRenter.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const pastAsRenter   = asRenter.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));
  const activeAsOwner  = asOwner.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const pastAsOwner    = asOwner.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-5xl mx-auto px-5 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#111]">🔑 การเช่าของฉัน</h1>
            <p className="text-sm text-[#777] mt-0.5">ติดตามการเช่าและให้เช่าทั้งหมดของคุณ</p>
          </div>
          <Link
            href="/rental"
            className="px-4 py-2 bg-[#e8500a] text-white text-sm font-bold rounded-xl hover:bg-[#c94208] transition"
          >
            ค้นหาสินค้าเช่า
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── ฉันเป็นผู้เช่า ── */}
          <section>
            <h2 className="text-sm font-bold text-[#333] mb-3 flex items-center gap-2">
              📥 ฉันเป็นผู้เช่า
              {activeAsRenter.length > 0 && (
                <span className="px-2 py-0.5 bg-[#e8500a] text-white text-[10px] font-bold rounded-full">
                  {activeAsRenter.length} กำลังดำเนิน
                </span>
              )}
            </h2>
            {asRenter.length === 0 ? (
              <EmptyCard msg="ยังไม่มีประวัติการเช่า" href="/rental" linkLabel="ค้นหาสินค้าเช่า" />
            ) : (
              <div className="space-y-2">
                {[...activeAsRenter, ...pastAsRenter].map((order: any) => (
                  <OrderRow key={order.id} order={order} counterpartyLabel="เจ้าของ" counterparty={order.owner} />
                ))}
              </div>
            )}
          </section>

          {/* ── ฉันเป็นเจ้าของ ── */}
          <section>
            <h2 className="text-sm font-bold text-[#333] mb-3 flex items-center gap-2">
              📤 ฉันเป็นเจ้าของ
              {activeAsOwner.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {activeAsOwner.length} กำลังดำเนิน
                </span>
              )}
            </h2>
            {asOwner.length === 0 ? (
              <EmptyCard msg="ยังไม่มีสินค้าถูกเช่า" href="/dashboard/my-items" linkLabel="จัดการสินค้าของฉัน" />
            ) : (
              <div className="space-y-2">
                {[...activeAsOwner, ...pastAsOwner].map((order: any) => (
                  <OrderRow key={order.id} order={order} counterpartyLabel="ผู้เช่า" counterparty={order.renter} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, counterpartyLabel, counterparty }: { order: any; counterpartyLabel: string; counterparty: any }) {
  const img    = order.item.images?.[0]?.url;
  const daysLeft = order.status === "ACTIVE" && order.rentalEndDate
    ? Math.ceil((new Date(order.rentalEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      href={`/rental/orders/${order.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-[#e5e3de] p-3.5
                 hover:border-[#e8500a]/40 hover:shadow-sm transition group"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#f0ede7] flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">{order.item.emoji ?? "📦"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111] truncate group-hover:text-[#e8500a] transition">
          {order.item.title}
        </p>
        <p className="text-xs text-[#999]">
          {counterpartyLabel}: {counterparty?.name ?? "—"}
        </p>
        {daysLeft !== null && (
          <p className={`text-xs mt-0.5 font-medium ${
            daysLeft < 0 ? "text-red-600" : daysLeft <= 1 ? "text-amber-600" : "text-[#777]"
          }`}>
            {daysLeft < 0 ? `⚠️ เกิน ${Math.abs(daysLeft)} วัน` :
             daysLeft === 0 ? "⏰ ครบวันนี้!" :
             `📅 คืนใน ${daysLeft} วัน`}
          </p>
        )}
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
        STATUS_COLOR[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      }`}>
        {STATUS_LABEL[order.status] ?? order.status}
      </span>
    </Link>
  );
}

function EmptyCard({ msg, href, linkLabel }: { msg: string; href: string; linkLabel: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-8 text-center">
      <p className="text-2xl mb-2">📭</p>
      <p className="text-sm text-[#777]">{msg}</p>
      <Link href={href}
        className="mt-3 inline-block px-4 py-2 bg-[#e8500a] text-white text-xs font-bold rounded-xl hover:bg-[#c94208] transition">
        {linkLabel}
      </Link>
    </div>
  );
}
