"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { confirmReceipt } from "@/lib/actions/escrow-actions";
import DisputeModal          from "@/components/forms/DisputeModal";
import ShippingModal         from "@/components/forms/ShippingModal";
import MeetupHandoverModal   from "@/components/forms/MeetupHandoverModal";
import CancelOrderModal from "@/components/forms/CancelOrderModal";
import ReceiptModal, { type ReceiptData } from "@/components/forms/ReceiptModal";
import ReviewModal from "@/components/forms/ReviewModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type EscrowStatus =
  | "FUNDS_HELD"
  | "SHIPPED"
  | "COMPLETED"
  | "DISPUTED"
  | "REFUNDED"
  | "CANCELLED_BY_ADMIN"
  | "CANCELLED"
  | "PENDING_CONFIRMATION"
  | "DELIVERED"
  | "MEETUP_SCHEDULED"
  | "MEETUP_COMPLETED"
  | "AWAITING_SHIPMENT"
  | "COD_SHIPPED"
  | "COD_DELIVERED"
  | "MEETUP_ARRANGED"
  | "MEETUP_CASH_COMPLETED";

interface OrderItem {
  id: string;
  title: string;
  emoji: string | null;
  images: { url: string }[];
  conversations?: { id: string }[];
}

interface OrderUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface BaseOrder {
  id: string;
  amount: number;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  shippedAt: string | null;
  shippingMethod:     string | null;
  trackingNumber:     string | null;
  shippingProofImage: string | null;
  deliveryMethod:     string | null;
  paymentMethod:      string | null;
  meetupLocation:       string | null;
  meetupDateTime:       string | null;
  meetupNote:           string | null;
  handoverSignature:    string | null;   // base64 PNG
  handoverPhotoUrl:     string | null;
  handoverConfirmedAt:  string | null;   // ISO
  review: { id: string; rating: number } | null;
  item: OrderItem;
}

interface BuyOrder extends BaseOrder {
  seller: OrderUser;
  buyer:  OrderUser;
}

interface SellOrder extends BaseOrder {
  buyer:  OrderUser;
  seller: OrderUser;
}

interface Props {
  buying:         BuyOrder[];
  selling:        SellOrder[];
  walletBalance:  number;
  escrowBalance:  number;
  currentUserId:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  POST:    "ไปรษณีย์ไทย",
  KERRY:   "Kerry Express",
  FLASH:   "Flash Express",
  "J&T":   "J&T Express",
  MEETUP:  "นัดรับด้วยตนเอง",
  OTHER:   "อื่นๆ",
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<EscrowStatus, { label: string; bg: string; text: string; dot: string }> = {
  FUNDS_HELD:           { label: "รอจัดส่ง",           bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  SHIPPED:              { label: "จัดส่งแล้ว",          bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  COMPLETED:            { label: "เสร็จสิ้น",           bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  DISPUTED:             { label: "มีข้อพิพาท",          bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  REFUNDED:             { label: "คืนเงินแล้ว",         bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500"  },
  CANCELLED_BY_ADMIN:   { label: "ยกเลิกโดย Admin",    bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400"   },
  CANCELLED:            { label: "ยกเลิกแล้ว",          bg: "bg-slate-50",   text: "text-slate-500",   dot: "bg-slate-400"   },
  PENDING_CONFIRMATION: { label: "รอยืนยัน",           bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-400"  },
  DELIVERED:            { label: "รับสินค้าแล้ว",       bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500"    },
  MEETUP_SCHEDULED:     { label: "นัดพบแล้ว",          bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  MEETUP_COMPLETED:     { label: "พบกันสำเร็จ",        bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  AWAITING_SHIPMENT:    { label: "รอจัดส่ง (COD)",     bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  COD_SHIPPED:          { label: "จัดส่งแล้ว (COD)",   bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  COD_DELIVERED:        { label: "รับ COD แล้ว",       bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500"    },
  MEETUP_ARRANGED:      { label: "นัดพบ (COD)",        bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500"     },
  MEETUP_CASH_COMPLETED:{ label: "พบกัน + รับเงิน",   bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

function StatusBadge({ status }: { status: EscrowStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.FUNDS_HELD;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Item Thumbnail ───────────────────────────────────────────────────────────

function Thumb({ item }: { item: OrderItem }) {
  const src = item.images[0]?.url;
  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f0ede7] flex-shrink-0 flex items-center justify-center text-2xl">
      {src
        ? <img src={src} alt={item.title} className="w-full h-full object-cover" />
        : <span>{item.emoji ?? "📦"}</span>
      }
    </div>
  );
}

// ─── Shipping Details ─────────────────────────────────────────────────────────

function ShippingDetails({ order }: { order: BaseOrder }) {
  if (!order.shippingMethod) return null;
  const methodName = METHOD_LABELS[order.shippingMethod] ?? order.shippingMethod;
  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
        <span>🚚</span><span>{methodName}</span>
      </div>
      {order.trackingNumber && (
        <div className="flex items-center gap-2">
          <span className="text-[#9a9590]">หมายเลขพัสดุ:</span>
          <span className="font-mono font-bold text-[#111]">{order.trackingNumber}</span>
          <button
            onClick={() => navigator.clipboard.writeText(order.trackingNumber!).catch(() => {})}
            className="px-2 py-0.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold transition text-[10px]"
          >
            คัดลอก
          </button>
        </div>
      )}
      {order.shippingProofImage && (
        <a href={order.shippingProofImage} target="_blank" rel="noopener noreferrer">
          <img
            src={order.shippingProofImage}
            alt="หลักฐานจัดส่ง"
            className="w-full max-h-24 object-cover rounded-lg border border-blue-200 mt-1 hover:opacity-90 transition"
          />
        </a>
      )}
    </div>
  );
}

// ─── Meetup Details ───────────────────────────────────────────────────────────

function MeetupDetails({ order }: { order: BaseOrder }) {
  if (!order.meetupLocation) return null;
  const dt = order.meetupDateTime
    ? new Date(order.meetupDateTime).toLocaleString("th-TH", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;
  return (
    <div className="mt-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 space-y-1 text-xs">
      <div className="flex items-center gap-1.5 text-sky-700 font-semibold">
        <span>🤝</span><span>นัดรับสินค้า</span>
      </div>
      <div className="flex items-center gap-1.5 text-[#555]">
        <span>📍</span><span>{order.meetupLocation}</span>
      </div>
      {dt && (
        <div className="flex items-center gap-1.5 text-[#555]">
          <span>🕐</span><span>{dt}</span>
        </div>
      )}
      {order.meetupNote && (
        <div className="flex items-center gap-1.5 text-[#9a9590]">
          <span>💬</span><span>{order.meetupNote}</span>
        </div>
      )}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  role,
  currentUserId,
  onShip,
  onConfirm,
  onMeetupHandover,
  onDispute,
  onCancel,
  onReceipt,
  onReview,
  pending,
}: {
  order:            BuyOrder | SellOrder;
  role:             "buyer" | "seller";
  currentUserId:    string;
  onShip:           (order: BuyOrder | SellOrder) => void;
  onConfirm:        (id: string) => void;
  onMeetupHandover: (order: BuyOrder | SellOrder) => void;
  onDispute:        (order: BuyOrder | SellOrder) => void;
  onCancel:         (order: BuyOrder | SellOrder) => void;
  onReceipt:        (order: BuyOrder | SellOrder) => void;
  onReview:         (order: BuyOrder | SellOrder) => void;
  pending:          boolean;
}) {
  const counterparty = role === "buyer"
    ? (order as BuyOrder).seller
    : (order as SellOrder).buyer;

  const date = new Date(order.createdAt).toLocaleDateString("th-TH", {
    day: "numeric", month: "short", year: "numeric",
  });

  const isMeetup  = order.deliveryMethod === "MEETUP";
  const isCOD     = order.paymentMethod  === "COD";

  // Determine if the viewing user IS the seller for this specific order
  const isSeller  = currentUserId === (order as SellOrder).seller?.id;

  // ── Action flags ─────────────────────────────────────────────────────────
  // Shipping (escrow): only the seller, only from FUNDS_HELD
  const canShip = isSeller && order.status === "FUNDS_HELD";

  // Meetup handover: ONLY the seller opens the Proof of Delivery modal
  const canMeetupHandover = isSeller && (
    order.status === "MEETUP_SCHEDULED" || order.status === "MEETUP_ARRANGED"
  );
  // Buyer sees a "waiting" badge on pending meetup orders
  const buyerWaitingMeetup = !isSeller && (
    order.status === "MEETUP_SCHEDULED" || order.status === "MEETUP_ARRANGED"
  );

  // Buyer confirms receipt for shipping flows
  const canConfirm = role === "buyer" && (
    order.status === "SHIPPED" || order.status === "COD_SHIPPED"
  );

  const canDispute = role === "buyer" && (
    order.status === "SHIPPED" || order.status === "COD_SHIPPED"
  );

  // Meetup 30-min grace period for sellers
  const isMeetupStatus = order.status === "MEETUP_SCHEDULED" || order.status === "MEETUP_ARRANGED";
  const meetupCutoffPassed = order.meetupDateTime
    ? Date.now() >= new Date(order.meetupDateTime).getTime() + 30 * 60 * 1000
    : false;
  const meetupCutoffTime = order.meetupDateTime
    ? new Date(new Date(order.meetupDateTime).getTime() + 30 * 60 * 1000)
        .toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : null;

  // Buyer can cancel any pre-shipment status; seller can cancel meetup only after 30 min
  const cancelableStatuses = ["FUNDS_HELD", "AWAITING_SHIPMENT", "MEETUP_SCHEDULED", "MEETUP_ARRANGED"];
  const canCancel = cancelableStatuses.includes(order.status) && (
    !isSeller ||                               // buyers always can
    !isMeetupStatus ||                         // seller non-meetup always can
    meetupCutoffPassed                         // seller meetup — only after 30-min grace
  );
  const sellerMeetupWaiting = isSeller && isMeetupStatus && !meetupCutoffPassed;

  const isCompleted = order.status === "COMPLETED";
  const canReview   = role === "buyer" && isCompleted && !order.review;
  const isTerminal  = ["COMPLETED", "REFUNDED", "CANCELLED_BY_ADMIN", "CANCELLED"].includes(order.status);

  const showShipping = ["SHIPPED", "COD_SHIPPED", "COMPLETED"].includes(order.status) && !!order.shippingMethod;
  const showMeetup   = isMeetup && !!order.meetupLocation;

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 ${
      isTerminal ? "border-[#f0ede7] opacity-80" : "border-[#e5e3de]"
    }`}>
      <div className="flex gap-4">
        <Thumb item={order.item} />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title + badge */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#111] truncate max-w-[200px]">{order.item.title}</p>
            <StatusBadge status={order.status} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9a9590]">
            <span className="font-bold text-[#111] text-sm">฿{order.amount.toLocaleString()}</span>
            <span>·</span>
            <span>{role === "buyer" ? "ขายโดย" : "ซื้อโดย"} {counterparty?.name ?? "ไม่ระบุชื่อ"}</span>
            {isMeetup && <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-semibold">🤝 นัดพบ</span>}
            {isCOD    && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">💵 COD</span>}
            <span>·</span>
            <span>{date}</span>
          </div>

          {/* Disputed notice */}
          {order.status === "DISPUTED" && (
            <p className="text-xs text-red-600 font-medium">
              🔒 เงินถูกอายัด — รอผู้ดูแลระบบตัดสิน
            </p>
          )}

          {/* Actions */}
          {!isTerminal && (
            <div className="flex flex-wrap gap-2 pt-1">
              {/* Shipping flow — seller ships */}
              {canShip && (
                <button
                  onClick={() => onShip(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-40"
                >
                  📦 ยืนยันจัดส่งแล้ว
                </button>
              )}

              {/* Meetup: seller opens POD modal */}
              {canMeetupHandover && (
                <button
                  onClick={() => onMeetupHandover(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40"
                >
                  🤝 ยืนยันการส่งมอบ
                </button>
              )}

              {/* Meetup: buyer sees waiting badge */}
              {buyerWaitingMeetup && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  รอผู้ขายส่งมอบ
                </span>
              )}

              {/* Shipping flow — buyer confirms receipt */}
              {canConfirm && (
                <button
                  onClick={() => onConfirm(order.id)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40"
                >
                  {pending ? "กำลังดำเนินการ…" : "✅ ยืนยันรับสินค้าแล้ว"}
                </button>
              )}

              {canDispute && (
                <button
                  onClick={() => onDispute(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-40"
                >
                  ⚠️ แจ้งปัญหา
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => onCancel(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f7f6f3] text-[#777] border border-[#e5e3de] hover:bg-[#f0ede7] transition disabled:opacity-40"
                >
                  ยกเลิก
                </button>
              )}

              {/* Seller meetup — show locked hint until 30-min grace period passes */}
              {sellerMeetupWaiting && meetupCutoffTime && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  ยกเลิกได้หลัง {meetupCutoffTime} น.
                </span>
              )}

              {/* Seller waiting notice — shipped, no actions for seller */}
              {isSeller && (order.status === "SHIPPED" || order.status === "COD_SHIPPED") && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  รอผู้ซื้อยืนยันรับสินค้า
                </span>
              )}
            </div>
          )}

          {/* Completed-order actions */}
          {isCompleted && (
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                onClick={() => onReceipt(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ดาวน์โหลดใบเสร็จ
              </button>
              {canReview && (
                <button
                  onClick={() => onReview(order)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                >
                  ⭐ ให้คะแนนผู้ขาย
                </button>
              )}
              {role === "buyer" && isCompleted && order.review && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#f7f6f3] text-[#9a9590] border border-[#e5e3de]">
                  {"⭐".repeat(order.review.rating)} รีวิวแล้ว
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details blocks */}
      {showShipping && <ShippingDetails order={order} />}
      {showMeetup   && <MeetupDetails   order={order} />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrdersClient({ buying, selling, walletBalance, escrowBalance, currentUserId }: Props) {
  const router = useRouter();
  const [tab, setTab]               = useState<"buying" | "selling">("buying");
  const [isPending, start]          = useTransition();
  const [actionId, setActionId]     = useState<string | null>(null);
  const [disputeTarget, setDisputeTarget]         = useState<BuyOrder | SellOrder | null>(null);
  const [shippingTarget, setShippingTarget]       = useState<BuyOrder | SellOrder | null>(null);
  const [cancelTarget, setCancelTarget]           = useState<BuyOrder | SellOrder | null>(null);
  const [meetupHandoverTarget, setMeetupHandoverTarget] = useState<BuyOrder | SellOrder | null>(null);
  const [receiptData, setReceiptData]             = useState<ReceiptData | null>(null);
  const [reviewTarget, setReviewTarget]           = useState<BuyOrder | null>(null);
  const [escrowTooltipOpen, setEscrowTooltipOpen] = useState(false);
  const toggleEscrowTooltip = useCallback(() => setEscrowTooltipOpen((v) => !v), []);
  const closeEscrowTooltip  = useCallback(() => setEscrowTooltipOpen(false), []);

  // Count buying orders where funds are actively held in escrow
  const activeEscrowOrderCount = buying.filter((o) =>
    ["FUNDS_HELD", "SHIPPED", "MEETUP_SCHEDULED", "DISPUTED"].includes(o.status)
  ).length;

  function handleConfirm(orderId: string) {
    const order = buying.find((o) => o.id === orderId) ?? null;
    setActionId(orderId);
    start(async () => {
      const res = await confirmReceipt(orderId);
      setActionId(null);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
        if (order) setReviewTarget(order);
      }
    });
  }

  function handleReceipt(order: BuyOrder | SellOrder) {
    const bo = order as BuyOrder;
    const so = order as SellOrder;
    setReceiptData({
      orderId:              order.id,
      itemTitle:            order.item.title,
      amount:               order.amount,
      completedAt:          order.updatedAt,
      buyerName:            bo.buyer?.name  ?? so.buyer?.name  ?? "ไม่ระบุ",
      sellerName:           bo.seller?.name ?? so.seller?.name ?? "ไม่ระบุ",
      deliveryMethod:       order.deliveryMethod   ?? undefined,
      shippingMethod:       order.shippingMethod   ?? undefined,
      trackingNumber:       order.trackingNumber   ?? undefined,
      shippingProofImage:   order.shippingProofImage  ?? undefined,
      handoverSignature:    order.handoverSignature   ?? undefined,
      handoverPhotoUrl:     order.handoverPhotoUrl    ?? undefined,
      handoverConfirmedAt:  order.handoverConfirmedAt ?? undefined,
    });
  }

  const activeTab = tab === "buying" ? buying : selling;

  return (
    <div className="space-y-6" onClick={escrowTooltipOpen ? closeEscrowTooltip : undefined}>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111]">คำสั่งซื้อของฉัน</h1>
        <p className="text-sm text-[#9a9590] mt-0.5">ติดตามสถานะการซื้อขายและจัดการการชำระเงิน Escrow</p>
      </div>

      {/* Wallet cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#e5e3de] px-5 py-4">
          <p className="text-xs text-[#9a9590] mb-1">กระเป๋าเงิน</p>
          <p className="text-2xl font-extrabold text-[#111]">฿{walletBalance.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-0.5">พร้อมใช้งาน</p>
        </div>
        <div className="relative bg-white rounded-2xl border border-[#e5e3de] px-5 py-4">
          {/* Label row with info icon */}
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-[#9a9590]">เงิน Escrow</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleEscrowTooltip(); }}
              aria-label="Escrow information"
              className="group relative flex-shrink-0 w-4 h-4 rounded-full bg-[#e5e3de] hover:bg-amber-200 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <svg className="w-2.5 h-2.5 text-[#9a9590] group-hover:text-amber-700 transition" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <p className="text-2xl font-extrabold text-amber-600">฿{escrowBalance.toLocaleString()}</p>
          <p className="text-xs text-amber-500 mt-0.5">
            {activeEscrowOrderCount > 0
              ? `${activeEscrowOrderCount} คำสั่งซื้อที่ถือเงินอยู่`
              : "รอการยืนยัน"}
          </p>

          {/* Tooltip — shown on hover (desktop) or tap toggle (mobile) */}
          {escrowTooltipOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 z-30 w-64 rounded-2xl bg-[#1a1a1a] text-white px-4 py-3 shadow-xl text-xs leading-relaxed"
              style={{ animation: "fadeIn 0.15s ease" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-bold text-amber-400 mb-1">ระบบ Escrow คืออะไร?</p>
              <p className="text-[#ccc]">
                เมื่อคุณซื้อสินค้า เงินจะถูกพักไว้กับ PSU.Store อย่างปลอดภัย
                และจะโอนให้ผู้ขายก็ต่อเมื่อคุณยืนยันว่าได้รับสินค้าแล้วเท่านั้น
              </p>
              {activeEscrowOrderCount > 0 && (
                <p className="mt-1.5 text-amber-300 font-semibold">
                  ขณะนี้มีเงินค้างอยู่ใน {activeEscrowOrderCount} คำสั่งซื้อ
                </p>
              )}
              {/* Arrow pointer */}
              <div className="absolute top-full left-6 -translate-y-px w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#1a1a1a]" />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f0ede7] p-1 rounded-2xl w-fit">
        {(["buying", "selling"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t ? "bg-white text-[#111] shadow-sm" : "text-[#9a9590] hover:text-[#555]"
            }`}
          >
            {t === "buying" ? `กำลังซื้อ (${buying.length})` : `กำลังขาย (${selling.length})`}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {activeTab.length === 0 ? (
          <div className="py-16 text-center text-[#9a9590]">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">{tab === "buying" ? "ยังไม่มีรายการซื้อ" : "ยังไม่มีรายการขาย"}</p>
          </div>
        ) : (
          activeTab.map((order) => (
            <OrderCard
              key={order.id}
              order={order as any}
              role={tab === "buying" ? "buyer" : "seller"}
              currentUserId={currentUserId}
              onShip={setShippingTarget}
              onConfirm={handleConfirm}
              onMeetupHandover={setMeetupHandoverTarget}
              onDispute={setDisputeTarget}
              onCancel={setCancelTarget}
              onReceipt={handleReceipt}
              onReview={(o) => setReviewTarget(o as BuyOrder)}
              pending={isPending && actionId === order.id}
            />
          ))
        )}
      </div>

      {/* Meetup handover (POD) modal — seller only */}
      {meetupHandoverTarget && (
        <MeetupHandoverModal
          orderId={meetupHandoverTarget.id}
          itemTitle={meetupHandoverTarget.item.title}
          buyerName={
            (meetupHandoverTarget as SellOrder).buyer?.name ??
            (meetupHandoverTarget as BuyOrder).buyer?.name  ?? "ผู้ซื้อ"
          }
          onClose={() => setMeetupHandoverTarget(null)}
          onSuccess={() => {
            setMeetupHandoverTarget(null);
            router.refresh();
          }}
        />
      )}

      {/* Shipping modal */}
      {shippingTarget && (
        <ShippingModal
          orderId={shippingTarget.id}
          itemTitle={shippingTarget.item.title}
          onClose={() => setShippingTarget(null)}
          onSuccess={() => { setShippingTarget(null); router.refresh(); }}
        />
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelOrderModal
          orderId={cancelTarget.id}
          itemTitle={cancelTarget.item.title}
          amount={cancelTarget.amount}
          role={tab === "buying" ? "buyer" : "seller"}
          paymentMethod={(cancelTarget as BuyOrder).buyer ? (cancelTarget as any).paymentMethod : undefined}
          meetupDateTime={(cancelTarget as any).meetupDateTime ?? null}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => { setCancelTarget(null); router.refresh(); }}
        />
      )}

      {/* Dispute modal */}
      {disputeTarget && (
        <DisputeModal
          orderId={disputeTarget.id}
          itemTitle={disputeTarget.item.title}
          amount={disputeTarget.amount}
          onClose={() => setDisputeTarget(null)}
          onSuccess={() => { setDisputeTarget(null); router.refresh(); }}
        />
      )}

      {/* Receipt modal */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Review modal */}
      {reviewTarget && (
        <ReviewModal
          orderId={reviewTarget.id}
          itemTitle={reviewTarget.item.title}
          sellerName={reviewTarget.seller?.name ?? "ผู้ขาย"}
          onClose={() => { setReviewTarget(null); router.refresh(); }}
          onSuccess={() => { setReviewTarget(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
