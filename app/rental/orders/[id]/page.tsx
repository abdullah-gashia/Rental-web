import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getRentalOrderDetail } from "@/lib/actions/rental-checkout";
import OwnerActions   from "./_components/OwnerActions";
import RenterActions  from "./_components/RenterActions";
import RentalHandshake from "./_components/RentalHandshake";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  REQUESTED:                "รอเจ้าของตอบรับ",
  APPROVED:                 "ตอบรับแล้ว",
  DEPOSIT_HELD:             "กักเงินแล้ว",
  REJECTED:                 "ถูกปฏิเสธ",
  EXPIRED:                  "หมดอายุ",
  CANCELLED:                "ยกเลิกแล้ว",
  PICKUP_SCHEDULED:         "นัดรับแล้ว",
  HANDED_OVER:              "ส่งมอบแล้ว",
  ACTIVE:                   "กำลังเช่าอยู่",
  OVERDUE:                  "เกินกำหนดคืน",
  RENEWAL_REQUESTED:        "ขอต่ออายุ",
  RETURN_SCHEDULED:         "นัดคืนแล้ว",
  RETURNED:                 "คืนแล้ว",
  COMPLETED:                "เสร็จสิ้น",
  COMPLETED_WITH_DEDUCTION: "เสร็จ (หักค่าเสียหาย)",
  DISPUTED:                 "มีข้อพิพาท",
  ITEM_LOST:                "ของสูญหาย",
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED:                "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED:                 "bg-blue-50 text-blue-700 border-blue-200",
  DEPOSIT_HELD:             "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED:                 "bg-red-50 text-red-700 border-red-200",
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

interface Props { params: Promise<{ id: string }> }

export default async function RentalOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order  = await getRentalOrderDetail(id);
  if (!order) notFound();

  const isRenter = order.currentUserRole === "RENTER";
  const isOwner  = order.currentUserRole === "OWNER";
  const item     = order.item;
  const img      = item.images.find((i: any) => i.isMain)?.url ?? item.images[0]?.url;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    }) : "—";

  // Handshake visibility
  const showPickupHandshake = ["APPROVED", "PICKUP_SCHEDULED"].includes(order.status);
  const showReturnHandshake = ["ACTIVE", "OVERDUE", "RETURN_SCHEDULED"].includes(order.status);

  // Due date calc
  const daysLeft = order.rentalEndDate
    ? Math.ceil((new Date(order.rentalEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-4xl mx-auto px-5 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#aaa] mb-5">
          <Link href="/dashboard/rentals" className="hover:text-[#555]">การเช่าของฉัน</Link>
          <span>/</span>
          <span className="text-[#555] font-medium truncate max-w-[200px]">{item.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111]">{item.title}</h1>
            <p className="text-sm text-[#777] mt-1">
              รหัส: {order.refCode.slice(0, 8).toUpperCase()}
              {" · "}
              {isRenter ? "คุณเป็นผู้เช่า" : "คุณเป็นเจ้าของ"}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            STATUS_COLOR[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
          }`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5">

          {/* ── LEFT ── */}
          <div className="space-y-4">

            {/* Due date banner */}
            {order.status === "ACTIVE" && daysLeft !== null && (
              <div className={`rounded-2xl border px-5 py-4 ${
                daysLeft < 0 ? "bg-red-50 border-red-200 text-red-700" :
                daysLeft <= 1 ? "bg-amber-50 border-amber-200 text-amber-700" :
                "bg-green-50 border-green-200 text-green-700"
              }`}>
                <p className="font-semibold text-sm">
                  {daysLeft < 0 ? `⚠️ เกินกำหนดคืน ${Math.abs(daysLeft)} วัน!` :
                   daysLeft === 0 ? "⏰ วันนี้ครบกำหนดคืน!" :
                   daysLeft === 1 ? "⏰ พรุ่งนี้ครบกำหนดคืน!" :
                   `📅 กำหนดคืนอีก ${daysLeft} วัน`}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  วันคืน: {fmtDate(order.rentalEndDate)}
                </p>
              </div>
            )}

            {order.status === "OVERDUE" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                <p className="text-red-700 font-semibold text-sm">⚠️ เกินกำหนดคืนแล้ว!</p>
                <p className="text-red-600 text-xs mt-1">
                  กำหนดคืน: {fmtDate(order.rentalEndDate)} — ค่าปรับกำลังถูกคิด
                </p>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && <OwnerActions orderId={order.id} status={order.status as any} />}

            {/* Renter actions */}
            {isRenter && <RenterActions orderId={order.id} status={order.status as any} />}

            {/* Pickup Handshake */}
            {showPickupHandshake && (
              <RentalHandshake
                orderId={order.id}
                type="pickup"
                role={order.currentUserRole}
                myConfirmed={isRenter ? order.pickupRenterConfirm : order.pickupOwnerConfirm}
                otherConfirmed={isRenter ? order.pickupOwnerConfirm : order.pickupRenterConfirm}
                itemTitle={item.title}
                rentalDays={order.rentalDays}
                securityDeposit={order.securityDeposit}
                lateFeePerDay={item.lateFeePerDay ?? 0}
                userName={isRenter ? order.renter.name ?? "—" : order.owner.name ?? "—"}
              />
            )}

            {/* Return Handshake */}
            {showReturnHandshake && (
              <RentalHandshake
                orderId={order.id}
                type="return"
                role={order.currentUserRole}
                myConfirmed={isRenter ? order.returnRenterConfirm : order.returnOwnerConfirm}
                otherConfirmed={isRenter ? order.returnOwnerConfirm : order.returnRenterConfirm}
                itemTitle={item.title}
                rentalDays={order.rentalDays}
                securityDeposit={order.securityDeposit}
                lateFeePerDay={item.lateFeePerDay ?? 0}
                userName={isRenter ? order.renter.name ?? "—" : order.owner.name ?? "—"}
              />
            )}

            {/* PDF Download buttons */}
            {["ACTIVE", "OVERDUE", "RETURN_SCHEDULED", "RETURNED",
              "COMPLETED", "COMPLETED_WITH_DEDUCTION"].includes(order.status) && (
              <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
                <h3 className="text-sm font-bold text-[#111] mb-3">📄 เอกสาร</h3>
                <div className="flex flex-col gap-2">
                  <a
                    href={`/rental/orders/${order.id}/receipt?type=contract`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-3 bg-[#faf9f7] border border-[#e5e3de]
                               rounded-xl text-sm text-[#333] hover:border-[#e8500a]/40 hover:bg-[#fff5f0] transition"
                  >
                    <span className="text-base">📜</span>
                    <div>
                      <p className="font-semibold">สัญญาเช่า</p>
                      <p className="text-xs text-[#999]">Rental Contract Agreement</p>
                    </div>
                    <span className="ml-auto text-xs text-[#aaa]">PDF ↗</span>
                  </a>
                  {["RETURNED", "COMPLETED", "COMPLETED_WITH_DEDUCTION"].includes(order.status) && (
                    <a
                      href={`/rental/orders/${order.id}/receipt?type=return`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-3 bg-[#faf9f7] border border-[#e5e3de]
                                 rounded-xl text-sm text-[#333] hover:border-[#e8500a]/40 hover:bg-[#fff5f0] transition"
                    >
                      <span className="text-base">🧾</span>
                      <div>
                        <p className="font-semibold">ใบเสร็จคืนสินค้า</p>
                        <p className="text-xs text-[#999]">Return Receipt</p>
                      </div>
                      <span className="ml-auto text-xs text-[#aaa]">PDF ↗</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Return photos evidence */}
            {order.returnPhotos.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
                <h3 className="text-sm font-bold text-[#111] mb-3">หลักฐานตอนคืนของ</h3>
                <div className="flex gap-2 flex-wrap mb-2">
                  {order.returnPhotos.map((url: string, i: number) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#e5e3de]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                {order.returnConditionNote && (
                  <p className="text-xs text-[#555]">หมายเหตุ: {order.returnConditionNote}</p>
                )}
              </div>
            )}

            {/* Status history */}
            {order.statusHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
                <h3 className="text-sm font-bold text-[#111] mb-3">ประวัติสถานะ</h3>
                <div className="space-y-3">
                  {order.statusHistory.map((h: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                        i === order.statusHistory.length - 1 ? "bg-[#e8500a]" : "bg-[#ddd]"
                      }`} />
                      <div>
                        <p className="font-semibold text-[#111]">
                          {STATUS_LABEL[h.status] ?? h.status}
                        </p>
                        {h.note && <p className="text-[#777]">{h.note}</p>}
                        <p className="text-[#aaa]">
                          {new Date(h.changedAt).toLocaleString("th-TH")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-4">

            {/* Item card */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-4 flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#f0ede7]">
                {img ? (
                  <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    {item.emoji ?? "📦"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/items/${item.id}`} className="text-sm font-semibold text-[#111] hover:text-[#e8500a] truncate block">
                  {item.title}
                </Link>
                <p className="text-xs text-[#999]">{item.category?.nameTh ?? "—"}</p>
              </div>
            </div>

            {/* Rental period */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">ระยะเวลาเช่า</h3>
              <div className="space-y-1.5 text-sm">
                <Row label="วันเริ่มเช่า"  value={fmtDate(order.rentalStartDate)} />
                <Row label="วันสิ้นสุดเช่า" value={fmtDate(order.rentalEndDate)} />
                <Row label="จำนวนวัน"      value={`${order.rentalDays} วัน`} />
                {order.actualPickupAt && <Row label="รับของจริง"    value={fmt(order.actualPickupAt)} />}
                {order.actualReturnDate && <Row label="คืนของจริง" value={fmt(order.actualReturnDate)} />}
              </div>
            </div>

            {/* Financial */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">สรุปการเงิน</h3>
              <div className="space-y-1.5 text-sm">
                <Row label={`ค่าเช่า (฿${order.dailyRate}/วัน × ${order.rentalDays})`} value={`฿${order.rentalFee.toLocaleString()}`} />
                <Row label="ค่าธรรมเนียม (5%)"  value={`฿${order.platformFee.toLocaleString()}`} />
                <Row label="เงินมัดจำ"           value={`฿${order.securityDeposit.toLocaleString()}`} />
                <div className="border-t border-[#f0ede7] pt-1.5 flex justify-between font-bold text-[#111]">
                  <span>ยอดที่หักไป</span>
                  <span>฿{order.totalPaid.toLocaleString()}</span>
                </div>
                {order.lateFees > 0 && <Row label="ค่าปรับล่าช้า" value={`฿${order.lateFees.toLocaleString()}`} color="text-red-600" />}
                {order.damageFees > 0 && <Row label="ค่าเสียหาย"   value={`฿${order.damageFees.toLocaleString()}`} color="text-red-600" />}
                {order.depositRefund !== null && isRenter && (
                  <Row label="มัดจำที่คืน" value={`฿${order.depositRefund?.toLocaleString()}`} color="text-green-600" />
                )}
                {order.ownerPayout !== null && isOwner && (
                  <Row label="คุณได้รับ" value={`฿${order.ownerPayout?.toLocaleString()}`} color="text-green-600" />
                )}
              </div>
            </div>

            {/* Pickup info */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">นัดรับ / คืน</h3>
              <div className="space-y-1.5 text-sm">
                {order.pickupLocation && <Row label="ที่นัดรับ"   value={`📍 ${order.pickupLocation}`} />}
                {order.pickupDateTime && <Row label="เวลานัดรับ"  value={fmt(order.pickupDateTime)} />}
                {order.returnLocation && order.returnLocation !== order.pickupLocation && (
                  <Row label="ที่นัดคืน" value={`📍 ${order.returnLocation}`} />
                )}
                {order.pickupNote && <Row label="หมายเหตุ" value={order.pickupNote} />}
              </div>
            </div>

            {/* Parties */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">คู่สัญญา</h3>
              <PartyRow label="เจ้าของ" user={order.owner} />
              <div className="border-t border-[#f0ede7] my-3" />
              <PartyRow label="ผู้เช่า" user={order.renter} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#777] flex-shrink-0">{label}</span>
      <span className={`font-medium text-right ${color ?? "text-[#111]"}`}>{value}</span>
    </div>
  );
}

function PartyRow({ label, user }: { label: string; user: any }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d]
                      flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {(user.name ?? "?")[0].toUpperCase()}
      </div>
      <div>
        <p className="text-xs font-semibold text-[#111]">{label}: {user.name ?? "—"}</p>
        {user.verificationStatus === "APPROVED" && (
          <p className="text-[11px] text-green-600">✅ ยืนยันตัวตนแล้ว</p>
        )}
      </div>
    </div>
  );
}
