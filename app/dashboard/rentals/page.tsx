import { getTr } from "@/lib/i18n/server";
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
  REQUESTED:                "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  APPROVED:                 "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[var(--c-line-str)]",
  PICKUP_SCHEDULED:         "bg-purple-50 text-purple-700 border-purple-200",
  ACTIVE:                   "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]",
  OVERDUE:                  "bg-[var(--c-danger-soft)] text-[var(--c-danger)] border-[var(--c-danger-line)]",
  RETURN_SCHEDULED:         "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  COMPLETED:                "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]",
  COMPLETED_WITH_DEDUCTION: "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  REJECTED:                 "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]",
  CANCELLED:                "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]",
  EXPIRED:                  "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]",
};

const ACTIVE_STATUSES = ["REQUESTED","APPROVED","PICKUP_SCHEDULED","ACTIVE","OVERDUE","RETURN_SCHEDULED"];

export default async function RentalDashboardPage() {
  const tr = await getTr();
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { asRenter, asOwner } = await getMyRentalOrders();

  const activeAsRenter = asRenter.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const pastAsRenter   = asRenter.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));
  const activeAsOwner  = asOwner.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
  const pastAsOwner    = asOwner.filter((o: any) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="min-h-screen bg-[var(--c-subtle)]">
      <div className="max-w-5xl mx-auto px-5 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--c-ink)]">{tr("🔑 การเช่าของฉัน")}</h1>
            <p className="text-sm text-[var(--c-ink-3)] mt-0.5">{tr("ติดตามการเช่าและให้เช่าทั้งหมดของคุณ")}</p>
          </div>
          <Link
            href="/rental"
            className="px-4 py-2 bg-[var(--c-accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--c-accent-str)] transition"
          >{tr("ค้นหาสินค้าเช่า")}</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── ฉันเป็นผู้เช่า ── */}
          <section>
            <h2 className="text-sm font-bold text-[var(--c-ink-1)] mb-3 flex items-center gap-2">
              📥 ฉันเป็นผู้เช่า
              {activeAsRenter.length > 0 && (
                <span className="px-2 py-0.5 bg-[var(--c-accent)] text-white text-[10px] font-bold rounded-full">
                  {activeAsRenter.length} กำลังดำเนิน
                </span>
              )}
            </h2>
            {asRenter.length === 0 ? (
              <EmptyCard msg={tr("ยังไม่มีประวัติการเช่า")} href="/rental" linkLabel={tr("ค้นหาสินค้าเช่า")} />
            ) : (
              <div className="space-y-2">
                {[...activeAsRenter, ...pastAsRenter].map((order: any) => (
                  <OrderRow key={order.id} order={order} counterpartyLabel={tr("เจ้าของ")} counterparty={order.owner} />
                ))}
              </div>
            )}
          </section>

          {/* ── ฉันเป็นเจ้าของ ── */}
          <section>
            <h2 className="text-sm font-bold text-[var(--c-ink-1)] mb-3 flex items-center gap-2">
              📤 ฉันเป็นเจ้าของ
              {activeAsOwner.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                  {activeAsOwner.length} กำลังดำเนิน
                </span>
              )}
            </h2>
            {asOwner.length === 0 ? (
              <EmptyCard msg={tr("ยังไม่มีสินค้าถูกเช่า")} href="/dashboard/my-items" linkLabel={tr("จัดการสินค้าของฉัน")} />
            ) : (
              <div className="space-y-2">
                {[...activeAsOwner, ...pastAsOwner].map((order: any) => (
                  <OrderRow key={order.id} order={order} counterpartyLabel={tr("ผู้เช่า")} counterparty={order.renter} />
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
      className="flex items-center gap-3 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] p-3.5
                 hover:border-[var(--c-accent)]/40 hover:shadow-sm transition group"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--c-line-soft)] flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-xl">{order.item.emoji ?? "📦"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--c-ink)] truncate group-hover:text-[var(--c-accent)] transition">
          {order.item.title}
        </p>
        <p className="text-xs text-[var(--c-faint)]">
          {counterpartyLabel}: {counterparty?.name ?? "—"}
        </p>
        {daysLeft !== null && (
          <p className={`text-xs mt-0.5 font-medium ${
            daysLeft < 0 ? "text-[var(--c-danger)]" : daysLeft <= 1 ? "text-[var(--c-warn)]" : "text-[var(--c-ink-3)]"
          }`}>
            {daysLeft < 0 ? `⚠️ เกิน ${Math.abs(daysLeft)} วัน` :
             daysLeft === 0 ? "⏰ ครบวันนี้!" :
             `📅 คืนใน ${daysLeft} วัน`}
          </p>
        )}
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
        STATUS_COLOR[order.status] ?? "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]"
      }`}>
        {STATUS_LABEL[order.status] ?? order.status}
      </span>
    </Link>
  );
}

function EmptyCard({ msg, href, linkLabel }: { msg: string; href: string; linkLabel: string }) {
  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-8 text-center">
      <p className="text-2xl mb-2">📭</p>
      <p className="text-sm text-[var(--c-ink-3)]">{msg}</p>
      <Link href={href}
        className="mt-3 inline-block px-4 py-2 bg-[var(--c-accent)] text-white text-xs font-bold rounded-xl hover:bg-[var(--c-accent-str)] transition">
        {linkLabel}
      </Link>
    </div>
  );
}
