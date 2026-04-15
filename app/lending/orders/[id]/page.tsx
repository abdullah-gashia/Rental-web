import { notFound } from "next/navigation";
import Link from "next/link";
import { getLendingOrderDetail } from "@/lib/actions/lending-orders";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, LENDING_CATEGORY_EMOJI } from "@/lib/constants/lending";
import DigitalHandshake from "./_components/DigitalHandshake";
import LenderActions from "./_components/LenderActions";
import BorrowerActions from "./_components/BorrowerActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LendingOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getLendingOrderDetail(id);

  if (!order) notFound();

  const isBorrower = order.currentUserRole === "BORROWER";
  const isLender = order.currentUserRole === "LENDER";
  const item = order.lendingItem;
  const emoji = LENDING_CATEGORY_EMOJI[item.category] ?? "📦";

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // Determine which handshake to show
  const showPickupHandshake = ["APPROVED", "DEPOSIT_HELD", "PICKUP_SCHEDULED", "PICKUP_IN_PROGRESS"].includes(order.status);
  const showReturnHandshake = ["RETURN_REQUESTED", "RETURN_SCHEDULED", "RETURN_IN_PROGRESS", "ACTIVE", "OVERDUE"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-4xl mx-auto px-5 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#aaa] mb-5">
          <Link href="/dashboard/lending" className="hover:text-[#555]">การยืมของฉัน</Link>
          <span>/</span>
          <span className="text-[#555] font-medium truncate max-w-[200px]">{item.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111]">{item.title}</h1>
            <p className="text-sm text-[#777] mt-1">
              {emoji} · รหัสอ้างอิง: {order.refCode.slice(0, 8).toUpperCase()}
              {" · "}{isBorrower ? "คุณเป็นผู้ยืม" : "คุณเป็นเจ้าของ"}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            ORDER_STATUS_COLOR[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
          }`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-5">
          {/* ── LEFT ── */}
          <div className="space-y-5 md:order-1">

            {/* Active lending countdown */}
            {order.status === "ACTIVE" && order.dueDate && (
              <DueDateBanner dueDate={order.dueDate} />
            )}

            {order.status === "OVERDUE" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                <p className="text-red-700 font-semibold text-sm">⚠️ เกินกำหนดคืนแล้ว!</p>
                <p className="text-red-600 text-xs mt-1">
                  กำหนดคืน: {fmtDate(order.dueDate)} —
                  ค่าปรับ ฿{item.lateFeePerDay}/วัน กำลังถูกคิด
                </p>
              </div>
            )}

            {/* Handshake section */}
            {showPickupHandshake && (
              <DigitalHandshake
                orderId={order.id}
                type="pickup"
                role={order.currentUserRole as "BORROWER" | "LENDER"}
                myConfirmed={isBorrower ? order.pickupBorrowerConfirm : order.pickupLenderConfirm}
                otherConfirmed={isBorrower ? order.pickupLenderConfirm : order.pickupBorrowerConfirm}
              />
            )}

            {showReturnHandshake && (
              <DigitalHandshake
                orderId={order.id}
                type="return"
                role={order.currentUserRole as "BORROWER" | "LENDER"}
                myConfirmed={isBorrower ? order.returnBorrowerConfirm : order.returnLenderConfirm}
                otherConfirmed={isBorrower ? order.returnLenderConfirm : order.returnBorrowerConfirm}
              />
            )}

            {/* Lender approval panel */}
            {isLender && <LenderActions orderId={order.id} status={order.status} />}

            {/* Borrower cancel/return */}
            {isBorrower && <BorrowerActions orderId={order.id} status={order.status} />}

            {/* Pickup evidence */}
            {order.pickupPhotos.length > 0 && (
              <EvidenceSection title="หลักฐานตอนรับของ" photos={order.pickupPhotos} note={order.pickupNote} date={order.actualPickupAt} />
            )}

            {/* Return evidence */}
            {order.returnPhotos.length > 0 && (
              <EvidenceSection title="หลักฐานตอนคืนของ" photos={order.returnPhotos} note={order.returnNote} date={order.actualReturnAt} />
            )}

            {/* Status history */}
            <StatusTimeline history={order.statusHistory as any[]} />
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-4 md:order-2">
            {/* Financial summary */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">สรุปการเงิน</h3>
              <div className="space-y-2 text-sm">
                <Row label="ประเภทการเช่า" value={
                  order.rentalType === "FREE" ? "ฟรี" :
                  order.rentalType === "DAILY_RATE" ? `฿${order.dailyRate}/วัน` :
                  `฿${order.flatFee} เหมา`
                } />
                <Row label="จำนวนวันที่ขอยืม" value={`${order.requestedDays} วัน`} />
                <Row label="ค่าเช่าประเมิน" value={`฿${order.estimatedRentalFee.toLocaleString()}`} />
                <Row label="ค่าธรรมเนียมระบบ" value={`฿${order.platformFee.toLocaleString()}`} />
                <Row label="มัดจำ" value={`฿${order.depositAmount.toLocaleString()}`} />
                <div className="border-t border-[#f0ede7] pt-2 flex justify-between font-bold text-[#111]">
                  <span>รวมที่หักไป</span>
                  <span>฿{order.totalPaidByBorrower.toLocaleString()}</span>
                </div>
                {order.lateFees > 0 && (
                  <Row label="ค่าปรับ" value={`฿${order.lateFees.toLocaleString()}`} color="text-red-600" />
                )}
                {order.damageFees > 0 && (
                  <Row label="ค่าเสียหาย" value={`฿${order.damageFees.toLocaleString()}`} color="text-red-600" />
                )}
                {order.lenderPayout !== null && isLender && (
                  <Row label="คุณได้รับ" value={`฿${order.lenderPayout?.toLocaleString()}`} color="text-green-600" />
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">เวลาสำคัญ</h3>
              <div className="space-y-2 text-xs text-[#555]">
                <TimeRow label="ส่งคำขอ" value={fmtDate(order.requestedAt)} />
                {order.approvedAt && <TimeRow label="อนุมัติ" value={fmtDate(order.approvedAt)} />}
                {order.scheduledPickupAt && <TimeRow label="นัดรับของ" value={fmtDate(order.scheduledPickupAt)} />}
                {order.actualPickupAt && <TimeRow label="รับของจริง" value={fmtDate(order.actualPickupAt)} />}
                {order.dueDate && <TimeRow label="กำหนดคืน" value={fmtDate(order.dueDate)} alert={order.status === "OVERDUE"} />}
                {order.scheduledReturnAt && <TimeRow label="นัดคืน" value={fmtDate(order.scheduledReturnAt)} />}
                {order.actualReturnAt && <TimeRow label="คืนจริง" value={fmtDate(order.actualReturnAt)} />}
                {order.completedAt && <TimeRow label="เสร็จสิ้น" value={fmtDate(order.completedAt)} />}
              </div>
            </div>

            {/* Parties */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">คู่สัญญา</h3>
              <PartyRow label="เจ้าของ" user={order.lender} tier={order.lender.lendingTier} />
              <div className="border-t border-[#f0ede7] my-3" />
              <PartyRow label="ผู้ยืม" user={order.borrower} tier={order.borrower.lendingTier} />
            </div>

            {/* Meetup info */}
            {order.meetupLocation && (
              <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
                <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">สถานที่นัด</h3>
                <p className="text-sm text-[#555]">📍 {order.meetupLocation}</p>
                {order.meetupNote && <p className="text-xs text-[#999] mt-1">{order.meetupNote}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DueDateBanner({ dueDate }: { dueDate: string }) {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const color = days <= 1 ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-green-50 border-green-200 text-green-700";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${color}`}>
      <p className="font-semibold text-sm">
        {days <= 0 ? "⏰ ครบกำหนดคืนแล้ว!" :
         days === 1 ? "⏰ ครบกำหนดคืนพรุ่งนี้!" :
         `📅 กำหนดคืนอีก ${days} วัน`}
      </p>
      <p className="text-xs mt-0.5 opacity-80">
        วันที่ {new Date(dueDate).toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

function EvidenceSection({ title, photos, note, date }: { title: string; photos: string[]; note: string | null; date: string | null }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
      <h3 className="text-sm font-bold text-[#111] mb-3">{title}</h3>
      <div className="flex gap-2 flex-wrap mb-2">
        {photos.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#e5e3de]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {note && <p className="text-xs text-[#555]">หมายเหตุ: {note}</p>}
      {date && (
        <p className="text-[11px] text-[#aaa] mt-1">
          {new Date(date).toLocaleString("th-TH")}
        </p>
      )}
    </div>
  );
}

function StatusTimeline({ history }: { history: Array<{ status: string; at: string }> }) {
  if (!history.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
      <h3 className="text-sm font-bold text-[#111] mb-3">ประวัติสถานะ</h3>
      <div className="space-y-3">
        {history.map((h, i) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
              i === history.length - 1 ? "bg-[#e8500a]" : "bg-[#ddd]"
            }`} />
            <div>
              <p className="font-semibold text-[#111]">
                {ORDER_STATUS_LABEL[h.status] ?? h.status}
              </p>
              <p className="text-[#aaa]">
                {new Date(h.at).toLocaleString("th-TH")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#777]">{label}</span>
      <span className={`font-medium ${color ?? "text-[#111]"}`}>{value}</span>
    </div>
  );
}

function TimeRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#999]">{label}</span>
      <span className={alert ? "text-red-600 font-semibold" : "text-[#555]"}>{value}</span>
    </div>
  );
}

function PartyRow({ label, user, tier }: { label: string; user: any; tier: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d]
                      flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {(user.name ?? "?")[0].toUpperCase()}
      </div>
      <div>
        <p className="text-xs font-semibold text-[#111]">
          {label}: {user.name ?? "—"}
        </p>
        <p className="text-[11px] text-[#aaa]">
          {tier === "TRUSTED" ? "⭐ น่าเชื่อถือ" : tier === "STANDARD" ? "✔ มาตรฐาน" : "🆕 ผู้ใช้ใหม่"}
        </p>
      </div>
    </div>
  );
}
