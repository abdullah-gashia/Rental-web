import { getTr } from "@/lib/i18n/server";
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
  REQUESTED:                "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  APPROVED:                 "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[var(--c-line-str)]",
  DEPOSIT_HELD:             "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[var(--c-line-str)]",
  REJECTED:                 "bg-[var(--c-danger-soft)] text-[var(--c-danger)] border-[var(--c-danger-line)]",
  EXPIRED:                  "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]",
  CANCELLED:                "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]",
  PICKUP_SCHEDULED:         "bg-purple-50 text-purple-700 border-purple-200",
  HANDED_OVER:              "bg-purple-50 text-purple-700 border-purple-200",
  ACTIVE:                   "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]",
  OVERDUE:                  "bg-[var(--c-danger-soft)] text-[var(--c-danger)] border-[var(--c-danger-line)]",
  RETURN_SCHEDULED:         "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  RETURNED:                 "bg-teal-50 text-teal-700 border-teal-200",
  COMPLETED:                "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]",
  COMPLETED_WITH_DEDUCTION: "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  DISPUTED:                 "bg-[var(--c-danger-soft)] text-[var(--c-danger)] border-[var(--c-danger-line)]",
  ITEM_LOST:                "bg-[var(--c-danger-soft)] text-[var(--c-danger)] border-[var(--c-danger-line)]",
};

interface Props { params: Promise<{ id: string }> }

export default async function RentalOrderDetailPage({ params }: Props) {
  const tr = await getTr();
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
    <div className="min-h-screen bg-[var(--c-subtle)]">
      <div className="max-w-4xl mx-auto px-5 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--c-faint)] mb-5">
          <Link href="/dashboard/rentals" className="hover:text-[var(--c-ink-2)]">{tr("การเช่าของฉัน")}</Link>
          <span>/</span>
          <span className="text-[var(--c-ink-2)] font-medium truncate max-w-[200px]">{item.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[var(--c-ink)]">{item.title}</h1>
            <p className="text-sm text-[var(--c-ink-3)] mt-1">
              รหัส: {order.refCode.slice(0, 8).toUpperCase()}
              {" · "}
              {isRenter ? tr("คุณเป็นผู้เช่า") : tr("คุณเป็นเจ้าของ")}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            STATUS_COLOR[order.status] ?? "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]"
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
                daysLeft < 0 ? "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]" :
                daysLeft <= 1 ? "bg-[var(--c-warn-soft)] border-[var(--c-warn-line)] text-[var(--c-warn)]" :
                "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]"
              }`}>
                <p className="font-semibold text-sm">
                  {daysLeft < 0 ? `⚠️ เกินกำหนดคืน ${Math.abs(daysLeft)} วัน!` :
                   daysLeft === 0 ? tr("⏰ วันนี้ครบกำหนดคืน!") :
                   daysLeft === 1 ? tr("⏰ พรุ่งนี้ครบกำหนดคืน!") :
                   `📅 กำหนดคืนอีก ${daysLeft} วัน`}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  วันคืน: {fmtDate(order.rentalEndDate)}
                </p>
              </div>
            )}

            {order.status === "OVERDUE" && (
              <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-2xl px-5 py-4">
                <p className="text-[var(--c-danger)] font-semibold text-sm">{tr("⚠️ เกินกำหนดคืนแล้ว!")}</p>
                <p className="text-[var(--c-danger)] text-xs mt-1">
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
              <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
                <h3 className="text-sm font-bold text-[var(--c-ink)] mb-3">{tr("📄 เอกสาร")}</h3>
                <div className="flex flex-col gap-2">
                  <a
                    href={`/rental/orders/${order.id}/receipt?type=contract`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-3 bg-[var(--c-subtle)] border border-[var(--c-line)]
                               rounded-xl text-sm text-[var(--c-ink-1)] hover:border-[var(--c-accent)]/40 hover:bg-[var(--c-accent-soft)] transition"
                  >
                    <span className="text-base">📜</span>
                    <div>
                      <p className="font-semibold">{tr("สัญญาเช่า")}</p>
                      <p className="text-xs text-[var(--c-faint)]">Rental Contract Agreement</p>
                    </div>
                    <span className="ml-auto text-xs text-[var(--c-faint)]">PDF ↗</span>
                  </a>
                  {["RETURNED", "COMPLETED", "COMPLETED_WITH_DEDUCTION"].includes(order.status) && (
                    <a
                      href={`/rental/orders/${order.id}/receipt?type=return`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-3 bg-[var(--c-subtle)] border border-[var(--c-line)]
                                 rounded-xl text-sm text-[var(--c-ink-1)] hover:border-[var(--c-accent)]/40 hover:bg-[var(--c-accent-soft)] transition"
                    >
                      <span className="text-base">🧾</span>
                      <div>
                        <p className="font-semibold">{tr("ใบเสร็จคืนสินค้า")}</p>
                        <p className="text-xs text-[var(--c-faint)]">Return Receipt</p>
                      </div>
                      <span className="ml-auto text-xs text-[var(--c-faint)]">PDF ↗</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Return photos evidence */}
            {order.returnPhotos.length > 0 && (
              <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
                <h3 className="text-sm font-bold text-[var(--c-ink)] mb-3">{tr("หลักฐานตอนคืนของ")}</h3>
                <div className="flex gap-2 flex-wrap mb-2">
                  {order.returnPhotos.map((url: string, i: number) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--c-line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
                {order.returnConditionNote && (
                  <p className="text-xs text-[var(--c-ink-2)]">หมายเหตุ: {order.returnConditionNote}</p>
                )}
              </div>
            )}

            {/* Status history */}
            {order.statusHistory.length > 0 && (
              <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
                <h3 className="text-sm font-bold text-[var(--c-ink)] mb-3">{tr("ประวัติสถานะ")}</h3>
                <div className="space-y-3">
                  {order.statusHistory.map((h: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                        i === order.statusHistory.length - 1 ? "bg-[var(--c-accent)]" : "bg-[#ddd]"
                      }`} />
                      <div>
                        <p className="font-semibold text-[var(--c-ink)]">
                          {STATUS_LABEL[h.status] ?? h.status}
                        </p>
                        {h.note && <p className="text-[var(--c-ink-3)]">{h.note}</p>}
                        <p className="text-[var(--c-faint)]">
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
            <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-4 flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--c-line-soft)]">
                {img ? (
                  <Image src={img} alt="" fill className="object-contain" sizes="64px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    {item.emoji ?? "📦"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/items/${item.id}`} className="text-sm font-semibold text-[var(--c-ink)] hover:text-[var(--c-accent)] truncate block">
                  {item.title}
                </Link>
                <p className="text-xs text-[var(--c-faint)]">{item.category?.nameTh ?? "—"}</p>
              </div>
            </div>

            {/* Rental period */}
            <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
              <h3 className="text-xs font-bold text-[var(--c-faint)] uppercase tracking-wide mb-3">{tr("ระยะเวลาเช่า")}</h3>
              <div className="space-y-1.5 text-sm">
                <Row label={tr("วันเริ่มเช่า")}  value={fmtDate(order.rentalStartDate)} />
                <Row label={tr("วันสิ้นสุดเช่า")} value={fmtDate(order.rentalEndDate)} />
                <Row label={tr("จำนวนวัน")}      value={`${order.rentalDays} วัน`} />
                {order.actualPickupAt && <Row label={tr("รับของจริง")}    value={fmt(order.actualPickupAt)} />}
                {order.actualReturnDate && <Row label={tr("คืนของจริง")} value={fmt(order.actualReturnDate)} />}
              </div>
            </div>

            {/* Financial */}
            <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
              <h3 className="text-xs font-bold text-[var(--c-faint)] uppercase tracking-wide mb-3">{tr("สรุปการเงิน")}</h3>
              <div className="space-y-1.5 text-sm">
                <Row label={`ค่าเช่า (฿${order.dailyRate}/วัน × ${order.rentalDays})`} value={`฿${order.rentalFee.toLocaleString()}`} />
                <Row label={tr("ค่าธรรมเนียม (5%)")}  value={`฿${order.platformFee.toLocaleString()}`} />
                <Row label={tr("เงินมัดจำ")}           value={`฿${order.securityDeposit.toLocaleString()}`} />
                <div className="border-t border-[var(--c-line-soft)] pt-1.5 flex justify-between font-bold text-[var(--c-ink)]">
                  <span>{tr("ยอดที่หักไป")}</span>
                  <span>฿{order.totalPaid.toLocaleString()}</span>
                </div>
                {order.lateFees > 0 && <Row label={tr("ค่าปรับล่าช้า")} value={`฿${order.lateFees.toLocaleString()}`} color="text-[var(--c-danger)]" />}
                {order.damageFees > 0 && <Row label={tr("ค่าเสียหาย")}   value={`฿${order.damageFees.toLocaleString()}`} color="text-[var(--c-danger)]" />}
                {order.depositRefund !== null && isRenter && (
                  <Row label={tr("มัดจำที่คืน")} value={`฿${order.depositRefund?.toLocaleString()}`} color="text-[var(--c-ok)]" />
                )}
                {order.ownerPayout !== null && isOwner && (
                  <Row label={tr("คุณได้รับ")} value={`฿${order.ownerPayout?.toLocaleString()}`} color="text-[var(--c-ok)]" />
                )}
              </div>
            </div>

            {/* Pickup info */}
            <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
              <h3 className="text-xs font-bold text-[var(--c-faint)] uppercase tracking-wide mb-3">{tr("นัดรับ / คืน")}</h3>
              <div className="space-y-1.5 text-sm">
                {order.pickupLocation && <Row label={tr("ที่นัดรับ")}   value={`📍 ${order.pickupLocation}`} />}
                {order.pickupDateTime && <Row label={tr("เวลานัดรับ")}  value={fmt(order.pickupDateTime)} />}
                {order.returnLocation && order.returnLocation !== order.pickupLocation && (
                  <Row label={tr("ที่นัดคืน")} value={`📍 ${order.returnLocation}`} />
                )}
                {order.pickupNote && <Row label={tr("หมายเหตุ")} value={order.pickupNote} />}
              </div>
            </div>

            {/* Parties */}
            <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
              <h3 className="text-xs font-bold text-[var(--c-faint)] uppercase tracking-wide mb-3">{tr("คู่สัญญา")}</h3>
              <PartyRow label={tr("เจ้าของ")} user={order.owner} />
              <div className="border-t border-[var(--c-line-soft)] my-3" />
              <PartyRow label={tr("ผู้เช่า")} user={order.renter} />
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
      <span className="text-[var(--c-ink-3)] flex-shrink-0">{label}</span>
      <span className={`font-medium text-right ${color ?? "text-[var(--c-ink)]"}`}>{value}</span>
    </div>
  );
}

function PartyRow({ label, user }: { label: string; user: any }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-lite)]
                      flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {(user.name ?? "?")[0].toUpperCase()}
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--c-ink)]">{label}: {user.name ?? "—"}</p>
        {user.verificationStatus === "APPROVED" && (
          <p className="text-[11px] text-[var(--c-ok)]">✅ ยืนยันตัวตนแล้ว</p>
        )}
      </div>
    </div>
  );
}
