"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToastStore } from "@/lib/stores/toast-store";
import {
  confirmShipmentNew,
  confirmDelivery,
  confirmMeetupComplete,
  cancelOrderNew,
} from "@/lib/actions/order-transitions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderData {
  id: string;
  amount: number;
  status: string;
  deliveryMethod: string | null;
  paymentMethod: string | null;
  shippingAddress: any;
  meetupLocation: string | null;
  meetupDateTime: string | null;
  meetupNote: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  shippingProofImage: string | null;
  platformFee: number;
  shippingCost: number;
  totalAmount: number | null;
  sellerPayout: number | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  statusHistory: any;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  codConfirmedAt: string | null;
  expiresAt: string | null;
  buyerId: string;
  sellerId: string;
  item: {
    id: string;
    title: string;
    price: number;
    emoji: string | null;
    color: string | null;
    images: { url: string; isMain: boolean }[];
  };
  buyer: { id: string; name: string | null; email: string; image: string | null };
  seller: { id: string; name: string | null; email: string; image: string | null };
}

const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  FUNDS_HELD:            { label: "รอจัดส่ง (Escrow)",         emoji: "🔒",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  SHIPPED:               { label: "จัดส่งแล้ว",                emoji: "📦",  color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  DELIVERED:             { label: "ได้รับสินค้าแล้ว",          emoji: "📬",  color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  COMPLETED:             { label: "เสร็จสิ้น",                 emoji: "✅",  color: "text-green-700 bg-green-50 border-green-200" },
  DISPUTED:              { label: "มีข้อพิพาท",               emoji: "⚠️",  color: "text-red-700 bg-red-50 border-red-200" },
  CANCELLED:             { label: "ยกเลิกแล้ว",               emoji: "❌",  color: "text-gray-600 bg-gray-50 border-gray-200" },
  REFUNDED:              { label: "คืนเงินแล้ว",              emoji: "💰",  color: "text-amber-700 bg-amber-50 border-amber-200" },
  PENDING_CONFIRMATION:  { label: "รอผู้ขายยืนยัน",           emoji: "⏳",  color: "text-amber-700 bg-amber-50 border-amber-200" },
  MEETUP_SCHEDULED:      { label: "นัดรับแล้ว (Escrow)",       emoji: "🤝",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  MEETUP_COMPLETED:      { label: "นัดรับสำเร็จ",             emoji: "✅",  color: "text-green-700 bg-green-50 border-green-200" },
  AWAITING_SHIPMENT:     { label: "รอจัดส่ง (COD)",            emoji: "📋",  color: "text-amber-700 bg-amber-50 border-amber-200" },
  COD_SHIPPED:           { label: "จัดส่งแล้ว (COD)",          emoji: "📦",  color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  COD_DELIVERED:         { label: "ได้รับ (COD)",              emoji: "📬",  color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  MEETUP_ARRANGED:       { label: "นัดรับแล้ว (COD)",          emoji: "🤝",  color: "text-amber-700 bg-amber-50 border-amber-200" },
  MEETUP_CASH_COMPLETED: { label: "นัดรับ+จ่ายเงินสด สำเร็จ", emoji: "💵",  color: "text-green-700 bg-green-50 border-green-200" },
  CANCELLED_BY_ADMIN:    { label: "ผู้ดูแลยกเลิก",            emoji: "🚫",  color: "text-red-700 bg-red-50 border-red-200" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrderTrackingClient({
  order,
  currentUserId,
}: {
  order: OrderData;
  currentUserId: string;
}) {
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);
  const [isPending, startTransition] = useTransition();

  // Shipping modal state
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackNum, setTrackNum] = useState("");
  const [trackCarrier, setTrackCarrier] = useState("");

  const isBuyer = order.buyerId === currentUserId;
  const isSeller = order.sellerId === currentUserId;
  const st = STATUS_LABELS[order.status] ?? { label: order.status, emoji: "❓", color: "text-gray-600 bg-gray-50 border-gray-200" };
  const mainImage = order.item.images.find((i) => i.isMain) ?? order.item.images[0];

  // ── Actions ──────────────────────────────────────────────────────────

  function handleShip() {
    if (!trackNum.trim()) { showToast("⚠️ กรุณากรอกเลขพัสดุ"); return; }
    startTransition(async () => {
      const res = await confirmShipmentNew(order.id, trackNum, trackCarrier);
      if (res.error) showToast(`❌ ${res.error}`);
      else { showToast("✅ อัปเดตสถานะเรียบร้อย"); router.refresh(); }
    });
  }

  function handleConfirmDelivery() {
    startTransition(async () => {
      const res = await confirmDelivery(order.id);
      if (res.error) showToast(`❌ ${res.error}`);
      else { showToast("✅ ยืนยันรับสินค้าเรียบร้อย"); router.refresh(); }
    });
  }

  function handleConfirmMeetup() {
    startTransition(async () => {
      const res = await confirmMeetupComplete(order.id);
      if (res.error) showToast(`❌ ${res.error}`);
      else { showToast("✅ ยืนยันนัดรับสำเร็จ"); router.refresh(); }
    });
  }

  function handleCancel() {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำสั่งซื้อนี้?")) return;
    startTransition(async () => {
      const res = await cancelOrderNew(order.id);
      if (res.error) showToast(`❌ ${res.error}`);
      else { showToast("✅ ยกเลิกเรียบร้อย"); router.refresh(); }
    });
  }

  // ── Status History ──────────────────────────────────────────────────

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Back link */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm text-[#9a9590] hover:text-[#111] mb-6 transition"
      >
        ← กลับไปรายการคำสั่งซื้อ
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-6 mb-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#e8e5df] flex-shrink-0 flex items-center justify-center">
            {mainImage?.url ? (
              <img src={mainImage.url} alt={order.item.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{order.item.emoji ?? "📦"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-[#111]">{order.item.title}</h1>
            <p className="text-sm text-[#9a9590] mt-0.5">
              คำสั่งซื้อ #{order.id.slice(-8).toUpperCase()}
            </p>
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold border ${st.color}`}>
              <span>{st.emoji}</span>
              <span>{st.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#111] mb-3">📍 ข้อมูลการจัดส่ง</h2>

        {order.deliveryMethod === "SHIPPING" && order.shippingAddress ? (
          <div className="text-sm text-[#555] space-y-1">
            <p className="font-semibold">🚚 จัดส่งถึงที่อยู่</p>
            <p>{order.shippingAddress.recipientName}, {order.shippingAddress.phone}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
            <p>{order.shippingAddress.district}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
          </div>
        ) : order.deliveryMethod === "MEETUP" ? (
          <div className="text-sm text-[#555] space-y-1">
            <p className="font-semibold">🤝 นัดรับสินค้า</p>
            <p>📍 {order.meetupLocation}</p>
            {order.meetupDateTime && (
              <p>🕐 {new Date(order.meetupDateTime).toLocaleDateString("th-TH", {
                weekday: "short", day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}</p>
            )}
            {order.meetupNote && <p className="text-[#9a9590] italic">"{order.meetupNote}"</p>}
          </div>
        ) : (
          <p className="text-sm text-[#9a9590]">ไม่ระบุวิธีจัดส่ง (คำสั่งซื้อเดิม)</p>
        )}

        {/* Tracking info */}
        {order.trackingNumber && (
          <div className="mt-3 pt-3 border-t border-[#e5e3de]">
            <p className="text-sm text-[#555]">
              📦 เลขพัสดุ: <span className="font-bold text-[#111]">{order.trackingNumber}</span>
              {order.trackingCarrier && <span className="text-[#9a9590]"> ({order.trackingCarrier})</span>}
            </p>
          </div>
        )}
      </div>

      {/* Financial */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#111] mb-3">💰 ข้อมูลการเงิน</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#555]">ราคาสินค้า</span>
            <span>฿{order.amount.toLocaleString()}</span>
          </div>
          {order.shippingCost > 0 && (
            <div className="flex justify-between">
              <span className="text-[#555]">ค่าจัดส่ง</span>
              <span>฿{order.shippingCost.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#555]">ค่าธรรมเนียม</span>
            <span>{order.platformFee > 0 ? `฿${order.platformFee.toLocaleString()}` : "฿0 (ฟรี)"}</span>
          </div>
          <div className="flex justify-between font-bold text-[#111] border-t border-[#e5e3de] pt-2">
            <span>รวมทั้งสิ้น</span>
            <span>฿{(order.totalAmount ?? order.amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-[#9a9590]">
            <span>การชำระเงิน</span>
            <span>{order.paymentMethod === "COD" ? "💵 เงินสด" : "💳 Escrow"}</span>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 mb-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#111] mb-3">👤 คู่สัญญา</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#9a9590] font-semibold mb-1">ผู้ซื้อ</p>
            <p className="font-bold text-[#111]">{order.buyer.name ?? order.buyer.email}</p>
            {isBuyer && <span className="text-[10px] text-blue-600 font-bold">(คุณ)</span>}
          </div>
          <div>
            <p className="text-xs text-[#9a9590] font-semibold mb-1">ผู้ขาย</p>
            <p className="font-bold text-[#111]">{order.seller.name ?? order.seller.email}</p>
            {isSeller && <span className="text-[10px] text-blue-600 font-bold">(คุณ)</span>}
          </div>
        </div>
      </div>

      {/* Status History Timeline */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 mb-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#111] mb-3">📜 ประวัติสถานะ</h2>
          <div className="space-y-3">
            {history.map((h: any, i: number) => {
              const hs = STATUS_LABELS[h.status];
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    i === history.length - 1 ? "bg-[#111] text-white" : "bg-[#e5e3de] text-[#9a9590]"
                  }`}>
                    {hs?.emoji ?? "·"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111]">{hs?.label ?? h.status}</p>
                    <p className="text-xs text-[#9a9590]">{h.note}</p>
                    <p className="text-[10px] text-[#bbb]">
                      {new Date(h.changedAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-[#111] mb-1">⚡ การดำเนินการ</h2>

        {/* Seller: Ship */}
        {isSeller && (order.status === "FUNDS_HELD" || order.status === "AWAITING_SHIPMENT") && (
          <>
            {!showShipForm ? (
              <button
                onClick={() => setShowShipForm(true)}
                disabled={isPending}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40"
              >
                📦 จัดส่งสินค้า
              </button>
            ) : (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <input
                  type="text"
                  value={trackNum}
                  onChange={(e) => setTrackNum(e.target.value)}
                  placeholder="เลขพัสดุ *"
                  className="checkout-input"
                />
                <input
                  type="text"
                  value={trackCarrier}
                  onChange={(e) => setTrackCarrier(e.target.value)}
                  placeholder="ขนส่ง (e.g. Kerry, Flash)"
                  className="checkout-input"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowShipForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#e5e3de] text-sm">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleShip}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40"
                  >
                    {isPending ? "กำลังอัปเดต…" : "✅ ยืนยันจัดส่ง"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Buyer: Confirm delivery */}
        {isBuyer && (order.status === "SHIPPED" || order.status === "COD_SHIPPED") && (
          <button
            onClick={handleConfirmDelivery}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-40"
          >
            {isPending ? "กำลังดำเนินการ…" : "📬 ยืนยันรับสินค้า"}
          </button>
        )}

        {/* Either: Confirm meetup */}
        {(order.status === "MEETUP_SCHEDULED" || order.status === "MEETUP_ARRANGED") && (
          <button
            onClick={handleConfirmMeetup}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-40"
          >
            {isPending ? "กำลังดำเนินการ…" : "🤝 ยืนยันนัดรับสำเร็จ"}
          </button>
        )}

        {/* Cancel */}
        {["FUNDS_HELD", "AWAITING_SHIPMENT", "MEETUP_SCHEDULED", "MEETUP_ARRANGED", "PENDING_CONFIRMATION"].includes(order.status) && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="w-full py-3 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition disabled:opacity-40"
          >
            ❌ ยกเลิกคำสั่งซื้อ
          </button>
        )}

        {/* Completed / Cancelled — no actions */}
        {["COMPLETED", "CANCELLED", "REFUNDED", "CANCELLED_BY_ADMIN"].includes(order.status) && (
          <p className="text-center text-sm text-[#9a9590] py-2">
            คำสั่งซื้อนี้ {order.status === "COMPLETED" ? "เสร็จสิ้นแล้ว" : "ถูกยกเลิกแล้ว"}
          </p>
        )}

        {/* Cancel info */}
        {order.cancelReason && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <p className="font-semibold">เหตุผลที่ยกเลิก:</p>
            <p>{order.cancelReason}</p>
          </div>
        )}

        {/* Back to orders */}
        <Link
          href="/dashboard/orders"
          className="block text-center py-2.5 text-sm text-[#9a9590] hover:text-[#111] transition"
        >
          ← กลับไปรายการทั้งหมด
        </Link>
      </div>
    </div>
  );
}
