"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resolveDispute,
  checkAndAutoReleaseEscrows,
} from "@/lib/actions/escrow-actions";
import SystemMessage, { parseSystemMessage } from "@/components/chat/SystemMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DisputeRecord {
  id:             string;
  reason:         string;
  evidenceImages: string[];
  status:         "OPEN" | "RESOLVED";
  createdAt:      string;
  reporter: { id: string; name: string | null; image: string | null };
}

interface ChatMessage {
  id:        string;
  content:   string;
  createdAt: string;
  sender:    { id: string; name: string | null; image: string | null };
}

interface DisputedOrder {
  id:           string;
  amount:       number;
  status:       string;
  shippedAt:    string | null;
  disputeReason: string | null;   // legacy fallback (no Dispute record)
  createdAt:    string;
  updatedAt:    string;
  dispute:      DisputeRecord | null;
  buyer:        { id: string; name: string | null; image: string | null; email: string };
  seller:       { id: string; name: string | null; image: string | null; email: string };
  item: {
    id:    string;
    title: string;
    emoji: string | null;
    images: { url: string }[];
    conversations: {
      id:       string;
      messages: ChatMessage[];
    }[];
  };
}

interface Props {
  orders: DisputedOrder[];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = "sm" }: { user: { name: string | null; image: string | null }; size?: "sm" | "md" }) {
  const px = size === "md" ? "w-9 h-9" : "w-6 h-6";
  const txt = size === "md" ? "text-xs" : "text-[10px]";
  return (
    <div className={`${px} rounded-full bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-lite)] flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {user.image
        ? <img src={user.image} alt="" className="w-full h-full object-cover" />
        : <span className={`font-bold text-white ${txt}`}>{(user.name ?? "?")[0].toUpperCase()}</span>
      }
    </div>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function EvidenceGallery({ images }: { images: string[] }) {
  const tr = useLocaleStore((s) => s.tr);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) return (
    <p className="text-xs text-[var(--c-muted)] italic">{tr("ไม่มีรูปภาพหลักฐาน")}</p>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightbox(url)}
            className="w-20 h-20 rounded-xl overflow-hidden border border-[var(--c-line)] hover:ring-2 hover:ring-[var(--c-accent)] transition flex-shrink-0"
          >
            <img src={url} alt={`หลักฐาน ${i + 1}`} className="w-full h-full object-contain" />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="หลักฐาน"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--c-surface)]/20 text-white flex items-center justify-center hover:bg-[var(--c-surface)]/30 transition text-lg"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// ─── Chat Log ─────────────────────────────────────────────────────────────────

function ChatLog({
  conversations,
  buyerId,
  sellerId,
}: {
  conversations: DisputedOrder["item"]["conversations"];
  buyerId:  string;
  sellerId: string;
}) {
  const tr = useLocaleStore((s) => s.tr);
  const [open, setOpen] = useState(false);

  // Find the conversation that includes both parties
  const conv = conversations.find((c) => {
    const senderIds = new Set(c.messages.map((m) => m.sender.id));
    return senderIds.has(buyerId) || senderIds.has(sellerId);
  }) ?? conversations[0];

  const messages = conv?.messages ?? [];

  return (
    <div className="border border-[var(--c-line)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--c-canvas)] hover:bg-[var(--c-line-soft)] transition text-sm font-semibold text-[var(--c-ink-2)]"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          บันทึกแชท ({messages.length} ข้อความล่าสุด)
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--c-line-soft)]">
          {messages.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--c-muted)]">{tr("ไม่มีข้อความ")}</p>
          ) : (
            messages.map((msg) => {
              const isSystem = parseSystemMessage(msg.content) !== null;

              // ── System message: render as evidence card ──────────
              if (isSystem) {
                return (
                  <div key={msg.id} className="px-4 py-3 bg-[#fafaf9]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-[10px] text-[var(--c-accent)] font-bold uppercase tracking-wider">{tr("ข้อมูลระบบ (System Record)")}</span>
                      <span className="text-[10px] text-[var(--c-faint-2)] ml-auto">
                        {new Date(msg.createdAt).toLocaleString("th-TH", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <SystemMessage content={msg.content} />
                  </div>
                );
              }

              const isBuyer = msg.sender.id === buyerId;
              return (
                <div key={msg.id} className={`px-4 py-3 flex gap-3 ${isBuyer ? "" : "bg-[#fdfcfb]"}`}>
                  <Avatar user={msg.sender} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--c-ink)]">
                        {msg.sender.name ?? "ไม่ระบุชื่อ"}
                      </span>
                      <span className="text-[10px] text-[var(--c-muted)]">
                        {isBuyer ? "(ผู้ซื้อ)" : "(ผู้ขาย)"}
                      </span>
                      <span className="text-[10px] text-[var(--c-faint-2)] ml-auto">
                        {new Date(msg.createdAt).toLocaleString("th-TH", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-[#444] mt-0.5 break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dispute Card ─────────────────────────────────────────────────────────────

function DisputeCard({
  order,
  onResolve,
  resolving,
}: {
  order:     DisputedOrder;
  onResolve: (orderId: string, resolution: "REFUND_BUYER" | "RELEASE_TO_SELLER") => void;
  resolving: boolean;
}) {
  const tr = useLocaleStore((s) => s.tr);
  const [confirmAction, setConfirmAction] = useState<"REFUND_BUYER" | "RELEASE_TO_SELLER" | null>(null);

  const dispute     = order.dispute;
  const reason      = dispute?.reason ?? order.disputeReason ?? "ไม่ระบุเหตุผล";
  const evidence    = dispute?.evidenceImages ?? [];
  const reporter    = dispute?.reporter;
  const reporterLabel = reporter?.id === order.buyer.id ? "ผู้ซื้อ" : reporter?.id === order.seller.id ? "ผู้ขาย" : "ไม่ทราบ";

  const filedDate   = dispute?.createdAt ?? order.updatedAt;
  const itemImg     = order.item.images[0]?.url;

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-danger-line)] overflow-hidden">

      {/* ── Header strip ───────────────────────────────────────────────────── */}
      <div className="bg-[var(--c-danger-soft)] border-b border-red-100 px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--c-danger)]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{tr("ข้อพิพาท")}</span>
        <span className="text-xs text-[var(--c-danger)] font-medium ml-auto">
          เปิดเมื่อ {new Date(filedDate).toLocaleDateString("th-TH", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Order Summary ──────────────────────────────────────────────────── */}
        <div className="flex gap-4">
          {/* Item thumbnail */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--c-line-soft)] flex-shrink-0 flex items-center justify-center text-2xl border border-[var(--c-line)]">
            {itemImg
              ? <img src={itemImg} alt={order.item.title} className="w-full h-full object-contain" />
              : <span>{order.item.emoji ?? "📦"}</span>
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[var(--c-ink)] truncate">{order.item.title}</p>
            <p className="text-lg font-extrabold text-[var(--c-danger)] mt-0.5">
              ฿{order.amount.toLocaleString()}
              <span className="text-xs font-normal text-[var(--c-muted)] ml-2">{tr("ถูกอายัด")}</span>
            </p>
          </div>
        </div>

        {/* ── Parties ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "ผู้ซื้อ", user: order.buyer,  accent: "blue"   },
            { label: "ผู้ขาย", user: order.seller, accent: "orange" },
          ].map(({ label, user, accent }) => (
            <div
              key={label}
              className={`rounded-xl border p-3 flex items-center gap-3 ${
                accent === "blue" ? "border-blue-100 bg-[var(--c-accent-soft)]" : "border-orange-100 bg-[var(--c-warn-soft)]"
              }`}
            >
              <Avatar user={user} size="md" />
              <div className="min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  accent === "blue" ? "text-blue-500" : "text-orange-500"
                }`}>{label}</p>
                <p className="text-sm font-semibold text-[var(--c-ink)] truncate">{user.name ?? "ไม่ระบุชื่อ"}</p>
                <p className="text-[10px] text-[var(--c-muted)] truncate">{user.email}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Dispute reason ────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-[var(--c-canvas)] border border-[var(--c-line)] p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--c-ink-2)] uppercase tracking-wider">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            เหตุผล
            {reporter && (
              <span className="ml-auto font-normal text-[var(--c-muted)] normal-case tracking-normal">
                รายงานโดย{reporterLabel} ({reporter.name ?? "ไม่ระบุชื่อ"})
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--c-ink-1)] leading-relaxed">{reason}</p>
        </div>

        {/* ── Evidence images ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--c-ink-2)] uppercase tracking-wider">
            หลักฐาน ({evidence.length} ภาพ)
          </p>
          <EvidenceGallery images={evidence} />
        </div>

        {/* ── Chat log ─────────────────────────────────────────────────────── */}
        <ChatLog
          conversations={order.item.conversations}
          buyerId={order.buyer.id}
          sellerId={order.seller.id}
        />

        {/* ── Admin action buttons ──────────────────────────────────────────── */}
        {confirmAction ? (
          <div className="rounded-2xl border-2 border-amber-300 bg-[var(--c-warn-soft)] p-4 space-y-3">
            <p className="text-sm font-bold text-amber-900">
              ยืนยัน:{" "}
              {confirmAction === "REFUND_BUYER"
                ? "คืนเงิน ฿" + order.amount.toLocaleString() + " ให้ผู้ซื้อ"
                : "โอนเงิน ฿" + order.amount.toLocaleString() + " ให้ผู้ขาย"}
            </p>
            <p className="text-xs text-[var(--c-warn)]">{tr("การกระทำนี้ไม่สามารถยกเลิกได้")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl border border-amber-300 text-sm font-semibold text-amber-800 hover:bg-[var(--c-warn-soft)] transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => { onResolve(order.id, confirmAction); setConfirmAction(null); }}
                disabled={resolving}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resolving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                ยืนยัน
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-[var(--c-line-soft)]">
            <button
              onClick={() => setConfirmAction("REFUND_BUYER")}
              disabled={resolving}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>{tr("ตัดสินให้ผู้ซื้อ (คืนเงิน)")}</button>
            <button
              onClick={() => setConfirmAction("RELEASE_TO_SELLER")}
              disabled={resolving}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>{tr("ตัดสินให้ผู้ขาย (โอนเงิน)")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DisputesClient({ orders: initialOrders }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const router = useRouter();
  const [orders, setOrders]       = useState(initialOrders);
  const [isPending, start]        = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [autoMsg, setAutoMsg]     = useState<string | null>(null);

  function handleResolve(orderId: string, resolution: "REFUND_BUYER" | "RELEASE_TO_SELLER") {
    setResolvingId(orderId);
    start(async () => {
      const res = await resolveDispute(orderId, resolution);
      setResolvingId(null);
      if (res.error) {
        alert(res.error);
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        router.refresh();
      }
    });
  }

  function handleAutoRelease() {
  const tr = useLocaleStore((s) => s.tr);
    setAutoMsg(null);
    start(async () => {
      const res = await checkAndAutoReleaseEscrows();
      if ("error" in res) {
        setAutoMsg(`เกิดข้อผิดพลาด: ${res.error}`);
      } else {
        setAutoMsg(
          res.released === 0
            ? tr("ไม่มีรายการที่ต้องปลดล็อคอัตโนมัติ")
            : `✅ ปลดล็อคอัตโนมัติ ${res.released} รายการเรียบร้อยแล้ว`
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-ink)]">{tr("ศูนย์จัดการข้อพิพาท")}</h1>
          <p className="text-sm text-[var(--c-ink-3)] mt-1">{tr("ตรวจสอบหลักฐานและตัดสินผลเพื่อปลดล็อคเงิน Escrow")}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Open count badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${
            orders.length > 0
              ? "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
              : "bg-[var(--c-ok-soft)] border-[var(--c-ok-line)] text-[var(--c-ok)]"
          }`}>
            <span className={`w-2 h-2 rounded-full ${orders.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            {orders.length > 0 ? `${orders.length} คดีเปิดอยู่` : tr("ไม่มีข้อพิพาทที่รอ")}
          </div>

          {/* Auto-release trigger */}
          <button
            onClick={handleAutoRelease}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{tr("ตรวจ Auto-Release (7 วัน)")}</button>
        </div>
      </div>

      {/* Auto-release result message */}
      {autoMsg && (
        <div className="bg-[var(--c-accent-soft)] border border-[var(--c-line-str)] rounded-xl px-4 py-3 text-sm text-blue-800 font-medium">
          {autoMsg}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────────── */}
      {orders.length === 0 && (
        <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-16 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--c-ok)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--c-ink)] mb-1">{tr("ไม่มีข้อพิพาทที่รอตรวจสอบ")}</h3>
          <p className="text-sm text-[var(--c-ink-3)]">{tr("ทุกธุรกรรมดำเนินไปอย่างราบรื่น 🎉")}</p>
        </div>
      )}

      {/* ── Dispute cards ───────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {orders.map((order) => (
          <DisputeCard
            key={order.id}
            order={order}
            onResolve={handleResolve}
            resolving={isPending && resolvingId === order.id}
          />
        ))}
      </div>
    </div>
  );
}
