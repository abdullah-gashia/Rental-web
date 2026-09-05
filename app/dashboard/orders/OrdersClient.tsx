"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

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
  /** The review the signed-in user wrote for this order, if any */
  myReview: { id: string; rating: number } | null;
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
  FUNDS_HELD:           { label: "รอจัดส่ง",           bg: "bg-[var(--c-warn-soft)]",   text: "text-[var(--c-warn)]",   dot: "bg-amber-400"   },
  SHIPPED:              { label: "จัดส่งแล้ว",          bg: "bg-[var(--c-accent-soft)]",    text: "text-[var(--c-accent-str)]",    dot: "bg-blue-500"    },
  COMPLETED:            { label: "เสร็จสิ้น",           bg: "bg-[var(--c-ok-soft)]", text: "text-[var(--c-ok)]", dot: "bg-emerald-500" },
  DISPUTED:             { label: "มีข้อพิพาท",          bg: "bg-[var(--c-danger-soft)]",     text: "text-[var(--c-danger)]",     dot: "bg-red-500"     },
  REFUNDED:             { label: "คืนเงินแล้ว",         bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500"  },
  CANCELLED_BY_ADMIN:   { label: "ยกเลิกโดย Admin",    bg: "bg-[var(--c-subtle)]",   text: "text-[var(--c-ink-3)]",   dot: "bg-slate-400"   },
  CANCELLED:            { label: "ยกเลิกแล้ว",          bg: "bg-[var(--c-subtle)]",   text: "text-[var(--c-muted)]",   dot: "bg-slate-400"   },
  PENDING_CONFIRMATION: { label: "รอยืนยัน",           bg: "bg-[var(--c-warn-soft)]",  text: "text-[var(--c-warn)]",  dot: "bg-yellow-400"  },
  DELIVERED:            { label: "รับสินค้าแล้ว",       bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500"    },
  MEETUP_SCHEDULED:     { label: "นัดพบแล้ว",          bg: "bg-[var(--c-accent-soft)]",    text: "text-[var(--c-accent-str)]",    dot: "bg-blue-500"    },
  MEETUP_COMPLETED:     { label: "พบกันสำเร็จ",        bg: "bg-[var(--c-ok-soft)]", text: "text-[var(--c-ok)]", dot: "bg-emerald-500" },
  AWAITING_SHIPMENT:    { label: "รอจัดส่ง (COD)",     bg: "bg-[var(--c-warn-soft)]",   text: "text-[var(--c-warn)]",   dot: "bg-amber-400"   },
  COD_SHIPPED:          { label: "จัดส่งแล้ว (COD)",   bg: "bg-[var(--c-accent-soft)]",    text: "text-[var(--c-accent-str)]",    dot: "bg-blue-500"    },
  COD_DELIVERED:        { label: "รับ COD แล้ว",       bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500"    },
  MEETUP_ARRANGED:      { label: "นัดพบ (COD)",        bg: "bg-[var(--c-accent-soft)]",     text: "text-sky-700",     dot: "bg-sky-500"     },
  MEETUP_CASH_COMPLETED:{ label: "พบกัน + รับเงิน",   bg: "bg-[var(--c-ok-soft)]", text: "text-[var(--c-ok)]", dot: "bg-emerald-500" },
};

function StatusBadge({ status }: { status: EscrowStatus }) {
  const tr = useTr();
  const m = STATUS_META[status] ?? STATUS_META.FUNDS_HELD;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {tr(m.label)}
    </span>
  );
}

// ─── Item Thumbnail ───────────────────────────────────────────────────────────

function Thumb({ item }: { item: OrderItem }) {
  const src = item.images[0]?.url;
  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--c-line-soft)] flex-shrink-0 flex items-center justify-center text-2xl">
      {src
        ? <img src={src} alt={item.title} className="w-full h-full object-contain" />
        : <span>{item.emoji ?? "📦"}</span>
      }
    </div>
  );
}

// ─── Shipping Details ─────────────────────────────────────────────────────────

function ShippingDetails({ order }: { order: BaseOrder }) {
  const tr = useTr();
  if (!order.shippingMethod) return null;
  const methodName = tr(METHOD_LABELS[order.shippingMethod] ?? order.shippingMethod);
  return (
    <div className="mt-2 bg-[var(--c-accent-soft)] border border-blue-100 rounded-xl px-3 py-2 space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-[var(--c-accent-str)] font-semibold">
        <span>🚚</span><span>{methodName}</span>
      </div>
      {order.trackingNumber && (
        <div className="flex items-center gap-2">
          <span className="text-[var(--c-muted)]">{tr("หมายเลขพัสดุ:")}</span>
          <span className="font-mono font-bold text-[var(--c-ink)]">{order.trackingNumber}</span>
          <button
            onClick={() => navigator.clipboard.writeText(order.trackingNumber!).catch(() => {})}
            className="px-2 py-0.5 rounded-md bg-[var(--c-accent-soft)] hover:bg-blue-200 text-[var(--c-accent-str)] font-bold transition text-[10px]"
          >{tr("คัดลอก")}</button>
        </div>
      )}
      {order.shippingProofImage && (
        <a href={order.shippingProofImage} target="_blank" rel="noopener noreferrer">
          <img
            src={order.shippingProofImage}
            alt={tr("หลักฐานจัดส่ง")}
            className="w-full max-h-24 object-contain rounded-lg border border-[var(--c-line-str)] mt-1 hover:opacity-90 transition"
          />
        </a>
      )}
    </div>
  );
}

// ─── Meetup Details ───────────────────────────────────────────────────────────

function MeetupDetails({ order }: { order: BaseOrder }) {
  const tr = useTr();
  if (!order.meetupLocation) return null;
  const dt = order.meetupDateTime
    ? new Date(order.meetupDateTime).toLocaleString("th-TH", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;
  return (
    <div className="mt-2 bg-[var(--c-accent-soft)] border border-sky-100 rounded-xl px-3 py-2 space-y-1 text-xs">
      <div className="flex items-center gap-1.5 text-sky-700 font-semibold">
        <span>🤝</span><span>{tr("นัดรับสินค้า")}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[var(--c-ink-2)]">
        <span>📍</span><span>{order.meetupLocation}</span>
      </div>
      {dt && (
        <div className="flex items-center gap-1.5 text-[var(--c-ink-2)]">
          <span>🕐</span><span>{dt}</span>
        </div>
      )}
      {order.meetupNote && (
        <div className="flex items-center gap-1.5 text-[var(--c-muted)]">
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
  const tr = useTr();
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
  // Both sides rate each other once the order is complete
  const canReview   = isCompleted && !order.myReview;
  const isTerminal  = ["COMPLETED", "REFUNDED", "CANCELLED_BY_ADMIN", "CANCELLED"].includes(order.status);

  const showShipping = ["SHIPPED", "COD_SHIPPED", "COMPLETED"].includes(order.status) && !!order.shippingMethod;
  const showMeetup   = isMeetup && !!order.meetupLocation;

  return (
    <div className={`bg-[var(--c-surface)] rounded-2xl border p-4 space-y-3 ${
      isTerminal ? "border-[var(--c-line-soft)] opacity-80" : "border-[var(--c-line)]"
    }`}>
      <div className="flex gap-4">
        <Thumb item={order.item} />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title + badge */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-bold text-[var(--c-ink)] truncate max-w-[200px]">{order.item.title}</p>
            <StatusBadge status={order.status} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--c-muted)]">
            <span className="font-bold text-[var(--c-ink)] text-sm">฿{order.amount.toLocaleString()}</span>
            <span>·</span>
            <span>{role === "buyer" ? tr("ขายโดย") : tr("ซื้อโดย")} {counterparty?.name ?? tr("ไม่ระบุชื่อ")}</span>
            {isMeetup && <span className="px-2 py-0.5 rounded-full bg-[var(--c-accent-soft)] text-sky-600 font-semibold">{tr("🤝 นัดพบ")}</span>}
            {isCOD    && <span className="px-2 py-0.5 rounded-full bg-[var(--c-warn-soft)] text-[var(--c-warn)] font-semibold">💵 COD</span>}
            <span>·</span>
            <span>{date}</span>
          </div>

          {/* Disputed notice */}
          {order.status === "DISPUTED" && (
            <p className="text-xs text-[var(--c-danger)] font-medium">{tr("🔒 เงินถูกอายัด — รอผู้ดูแลระบบตัดสิน")}</p>
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
                >{tr("📦 ยืนยันจัดส่งแล้ว")}</button>
              )}

              {/* Meetup: seller opens POD modal */}
              {canMeetupHandover && (
                <button
                  onClick={() => onMeetupHandover(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40"
                >{tr("🤝 ยืนยันการส่งมอบ")}</button>
              )}

              {/* Meetup: buyer sees waiting badge */}
              {buyerWaitingMeetup && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--c-accent-soft)] border border-sky-200 text-xs font-semibold text-sky-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />{tr("รอผู้ขายส่งมอบ")}</span>
              )}

              {/* Shipping flow — buyer confirms receipt */}
              {canConfirm && (
                <button
                  onClick={() => onConfirm(order.id)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-40"
                >
                  {pending ? tr("กำลังดำเนินการ…") : tr("✅ ยืนยันรับสินค้าแล้ว")}
                </button>
              )}

              {canDispute && (
                <button
                  onClick={() => onDispute(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--c-danger-soft)] text-[var(--c-danger)] border border-[var(--c-danger-line)] hover:bg-[var(--c-danger-soft)] transition disabled:opacity-40"
                >{tr("⚠️ แจ้งปัญหา")}</button>
              )}

              {canCancel && (
                <button
                  onClick={() => onCancel(order)}
                  disabled={pending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--c-canvas)] text-[var(--c-ink-3)] border border-[var(--c-line)] hover:bg-[var(--c-line-soft)] transition disabled:opacity-40"
                >{tr("ยกเลิก")}</button>
              )}

              {/* Seller meetup — show locked hint until 30-min grace period passes */}
              {sellerMeetupWaiting && meetupCutoffTime && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] text-xs font-semibold text-[var(--c-warn)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{tr("ยกเลิกได้หลัง {0} น.", [meetupCutoffTime])}</span>
              )}

              {/* Seller waiting notice — shipped, no actions for seller */}
              {isSeller && (order.status === "SHIPPED" || order.status === "COD_SHIPPED") && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] text-xs font-semibold text-[var(--c-warn)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{tr("รอผู้ซื้อยืนยันรับสินค้า")}</span>
              )}
            </div>
          )}

          {/* Completed-order actions */}
          {isCompleted && (
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                onClick={() => onReceipt(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--c-ok-soft)] text-[var(--c-ok)] border border-[var(--c-ok-line)] hover:bg-emerald-100 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>{tr("ดาวน์โหลดใบเสร็จ")}</button>
              {canReview && (
                <button
                  onClick={() => onReview(order)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--c-warn-soft)] text-[var(--c-warn)] border border-[var(--c-warn-line)] hover:bg-[var(--c-warn-soft)] transition"
                >
                  ⭐ {isSeller ? tr("ให้คะแนนผู้ซื้อ") : tr("ให้คะแนนผู้ขาย")}
                </button>
              )}
              {isCompleted && order.myReview && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--c-canvas)] text-[var(--c-muted)] border border-[var(--c-line)]">
                  {"⭐".repeat(order.myReview.rating)} รีวิวแล้ว
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

export default function OrdersClient({
  buying, selling, walletBalance, escrowBalance, currentUserId, initialTab = "buying",
}: Props & { initialTab?: "buying" | "selling" }) {
  const tr = useTr();
  const router = useRouter();

  // The tab lives in the URL so the sidebar can link straight to tr("การขาย")
  // instead of always dropping the seller on the buying list first.
  const [tab, setTabState] = useState<"buying" | "selling">(initialTab);
  function setTab(next: "buying" | "selling") {
    setTabState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }
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
        alert(tr(res.error));
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
      buyerName:            bo.buyer?.name  ?? so.buyer?.name  ?? tr("ไม่ระบุ"),
      sellerName:           bo.seller?.name ?? so.seller?.name ?? tr("ไม่ระบุ"),
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
      <header className="ui-head">
        <div>
          <p className="ui-eyebrow mb-1.5">{tab === "buying" ? tr("การซื้อ") : tr("การขาย")}</p>
          <h1>{tab === "buying" ? tr("คำสั่งซื้อของฉัน") : tr("รายการที่ฉันขาย")}</h1>
          <p>
            {tab === "buying"
              ? tr("เงินจะถูกพักไว้จนกว่าคุณจะยืนยันว่าได้รับสินค้าแล้ว")
              : tr("ยืนยันการส่งมอบเพื่อให้ระบบปล่อยเงินเข้ากระเป๋าของคุณ")}
          </p>
        </div>
      </header>

      {/* Wallet cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="ui-stat">
          <p className="ui-stat-k">{tr("กระเป๋าเงิน")}</p>
          <p className="ui-stat-v">฿{walletBalance.toLocaleString()}</p>
          <p className="ui-stat-sub">{tr("พร้อมใช้งาน")}</p>
        </div>
        <div className="ui-stat relative">
          {/* Label row with info icon */}
          <div className="flex items-center gap-1 mb-1">
            <p className="ui-stat-k">{tr("เงิน Escrow")}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleEscrowTooltip(); }}
              aria-label="Escrow information"
              className="group relative flex-shrink-0 w-4 h-4 rounded-full bg-[var(--c-line)] hover:bg-amber-200 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <svg className="w-2.5 h-2.5 text-[var(--c-muted)] group-hover:text-[var(--c-warn)] transition" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <p className="ui-stat-v !text-[var(--c-warn)]">฿{escrowBalance.toLocaleString()}</p>
          <p className="ui-stat-sub">
            {activeEscrowOrderCount > 0
              ? tr("{0} คำสั่งซื้อที่ถือเงินอยู่", [activeEscrowOrderCount])
              : tr("รอการยืนยัน")}
          </p>

          {/* Tooltip — shown on hover (desktop) or tap toggle (mobile) */}
          {escrowTooltipOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 z-30 w-64 rounded-2xl bg-[#1a1a1a] text-white px-4 py-3 shadow-xl text-xs leading-relaxed"
              style={{ animation: "fadeIn 0.15s ease" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-bold text-amber-400 mb-1">{tr("ระบบ Escrow คืออะไร?")}</p>
              <p className="text-[var(--c-line-str)]">{tr("เมื่อคุณซื้อสินค้า เงินจะถูกพักไว้กับ PSU.Store อย่างปลอดภัย และจะโอนให้ผู้ขายก็ต่อเมื่อคุณยืนยันว่าได้รับสินค้าแล้วเท่านั้น")}</p>
              {activeEscrowOrderCount > 0 && (
                <p className="mt-1.5 text-amber-300 font-semibold">{tr("ขณะนี้มีเงินค้างอยู่ใน {0} คำสั่งซื้อ", [activeEscrowOrderCount])}</p>
              )}
              {/* Arrow pointer */}
              <div className="absolute top-full left-6 -translate-y-px w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#1a1a1a]" />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["buying", "selling"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`ui-chip ${tab === t ? "is-on" : ""}`}
          >
            {t === "buying" ? tr("ฉันซื้อ") : tr("ฉันขาย")}
            <span className="ui-chip-n">{t === "buying" ? buying.length : selling.length}</span>
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {activeTab.length === 0 ? (
          <div className="ui-card ui-empty">
            <div className="ui-empty-icon">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
              </svg>
            </div>
            <h3>{tab === "buying" ? tr("ยังไม่มีรายการซื้อ") : tr("ยังไม่มีรายการขาย")}</h3>
            <p>
              {tab === "buying"
                ? tr("เมื่อคุณสั่งซื้อสินค้า รายการจะขึ้นที่นี่พร้อมสถานะและขั้นตอนถัดไป")
                : tr("เมื่อมีคนสั่งซื้อสินค้าของคุณ รายการจะขึ้นที่นี่พร้อมสิ่งที่คุณต้องทำ")}
            </p>
            <a href={tab === "buying" ? "/" : "/dashboard/my-items"} className="ui-btn ui-btn-primary mt-4">
              {tab === "buying" ? tr("เลือกดูสินค้า") : tr("จัดการประกาศของฉัน")}
            </a>
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
            (meetupHandoverTarget as BuyOrder).buyer?.name  ?? tr("ผู้ซื้อ")
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
          counterpartyRole={reviewTarget.seller?.id === currentUserId ? "buyer" : "seller"}
          counterpartyName={
            reviewTarget.seller?.id === currentUserId
              ? (reviewTarget.buyer?.name  ?? tr("ผู้ซื้อ"))
              : (reviewTarget.seller?.name ?? tr("ผู้ขาย"))
          }
          onClose={() => { setReviewTarget(null); router.refresh(); }}
          onSuccess={() => { setReviewTarget(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
