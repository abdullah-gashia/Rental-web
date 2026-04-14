"use client";

import { useState, useTransition } from "react";
import Image                        from "next/image";
import type { OrderRow }            from "../../_lib/types";
import { formatThaiDate, formatRelativeDate, formatCurrency, truncateId } from "../../_lib/utils";
import StatusBadge                  from "../../_components/StatusBadge";
import ConfirmDialog                from "../../_components/ConfirmDialog";
import { forceCompleteOrder, forceCancelOrder } from "../actions";

interface Props {
  rows: OrderRow[];
}

export default function OrdersTable({ rows }: Props) {
  const [pending, startTransition] = useTransition();

  type DialogKind = "complete" | "cancel";
  const [dialog, setDialog] = useState<{
    kind:    DialogKind;
    orderId: string;
    ref:     string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  function handleConfirm() {
    if (!dialog) return;
    startTransition(async () => {
      let res;
      if (dialog.kind === "complete") {
        res = await forceCompleteOrder(dialog.orderId);
      } else {
        if (!cancelReason.trim()) return;
        res = await forceCancelOrder(dialog.orderId, cancelReason.trim());
      }
      setDialog(null);
      setCancelReason("");
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center text-[#aaa] text-sm">ไม่พบรายการสั่งซื้อ</div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[600] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!dialog}
        title={dialog?.kind === "complete" ? "บังคับให้คำสั่งซื้อสำเร็จ?" : "ยกเลิกคำสั่งซื้อ?"}
        description={
          dialog?.kind === "complete"
            ? `คำสั่งซื้อ ${dialog?.ref} จะถูกทำเครื่องหมายว่าสำเร็จ และเงินจะถูกปล่อยให้ผู้ขาย`
            : `คำสั่งซื้อ ${dialog?.ref} จะถูกยกเลิก และเงินจะถูกคืนให้ผู้ซื้อ กรุณาระบุเหตุผล`
        }
        confirmLabel={dialog?.kind === "complete" ? "บังคับสำเร็จ" : "ยกเลิก"}
        danger={dialog?.kind === "cancel"}
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => { setDialog(null); setCancelReason(""); }}
      >
        {dialog?.kind === "cancel" && (
          <textarea
            className="w-full border border-[#e5e3de] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a]"
            placeholder="เหตุผลในการยกเลิก..."
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        )}
      </ConfirmDialog>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e3de] bg-[#faf9f7]">
              <th className="text-left px-4 py-3 font-semibold text-[#555] w-8" />
              <th className="text-left px-4 py-3 font-semibold text-[#555]">รหัส</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555] w-[200px]">สินค้า</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">ผู้ซื้อ</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">ผู้ขาย</th>
              <th className="text-right px-4 py-3 font-semibold text-[#555]">จำนวนเงิน</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">การจัดส่ง</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">สถานะ</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">วันที่</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede7]">
            {rows.map((order) => (
              <>
                <tr
                  key={order.id}
                  className="hover:bg-[#faf9f7] transition cursor-pointer"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  {/* Expand toggle */}
                  <td className="px-4 py-3 text-[#aaa]">
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${expanded === order.id ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>

                  {/* Ref */}
                  <td className="px-4 py-3 font-mono text-xs text-[#555]">
                    <span className="font-semibold text-[#111]">
                      #{order.shortRef}
                    </span>
                    {order.hasDispute && (
                      <span className="ml-1.5 text-orange-500" title="มีข้อพิพาท">🚨</span>
                    )}
                  </td>

                  {/* Item */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {order.item.thumbnailUrl ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-[#f0ede7]">
                          <Image
                            src={order.item.thumbnailUrl}
                            alt={order.item.title}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#f0ede7] flex items-center justify-center text-sm flex-shrink-0">
                          📦
                        </div>
                      )}
                      <span className="truncate max-w-[140px] text-[#333]">{order.item.title}</span>
                    </div>
                  </td>

                  {/* Buyer */}
                  <td className="px-4 py-3">
                    <p className="text-[#333] truncate max-w-[120px]">{order.buyer.name ?? "—"}</p>
                    <p className="text-xs text-[#9a9590] truncate max-w-[120px]">{order.buyer.email}</p>
                  </td>

                  {/* Seller */}
                  <td className="px-4 py-3">
                    <p className="text-[#333] truncate max-w-[120px]">{order.seller.name ?? "—"}</p>
                    <p className="text-xs text-[#9a9590] truncate max-w-[120px]">{order.seller.email}</p>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right font-medium text-[#111] whitespace-nowrap">
                    {formatCurrency(order.totalAmount ?? order.amount)}
                  </td>

                  {/* Delivery / Payment */}
                  <td className="px-4 py-3">
                    <DeliveryMethodBadge delivery={order.deliveryMethod} payment={order.paymentMethod} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} type="order" />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-[#777] whitespace-nowrap">
                    {formatRelativeDate(order.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <OrderActionsDropdown
                      order={order}
                      onComplete={() =>
                        setDialog({ kind: "complete", orderId: order.id, ref: `#${order.shortRef}` })
                      }
                      onCancel={() =>
                        setDialog({ kind: "cancel", orderId: order.id, ref: `#${order.shortRef}` })
                      }
                    />
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === order.id && (
                  <tr key={`${order.id}-detail`} className="bg-[#faf9f7]">
                    <td colSpan={10} className="px-8 py-4 space-y-4">
                      {/* Core IDs + dates */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[#999] text-xs mb-1">รหัสเต็ม</p>
                          <p className="font-mono text-xs text-[#333]">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-[#999] text-xs mb-1">สินค้า ID</p>
                          <a
                            href={`/items/${order.item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-[#e8500a] hover:underline"
                          >
                            {truncateId(order.item.id)}
                          </a>
                        </div>
                        <div>
                          <p className="text-[#999] text-xs mb-1">วันที่สั่งซื้อ</p>
                          <p className="text-[#333]">{formatThaiDate(order.createdAt)}</p>
                        </div>
                        {order.shippedAt && (
                          <div>
                            <p className="text-[#999] text-xs mb-1">วันที่จัดส่ง</p>
                            <p className="text-[#333]">{formatThaiDate(order.shippedAt)}</p>
                          </div>
                        )}
                        {order.trackingNumber && (
                          <div>
                            <p className="text-[#999] text-xs mb-1">เลขพัสดุ</p>
                            <p className="font-mono text-xs text-[#333]">{order.trackingNumber}</p>
                          </div>
                        )}
                      </div>

                      {/* Delivery details */}
                      {order.deliveryMethod === "SHIPPING" && order.shippingAddress && (
                        <div className="bg-white border border-[#e5e3de] rounded-xl px-4 py-3 text-sm">
                          <p className="text-[#999] text-xs font-semibold uppercase tracking-wide mb-2">ที่อยู่จัดส่ง</p>
                          <p className="font-medium text-[#111]">{order.shippingAddress.recipientName}</p>
                          <p className="text-[#555]">{order.shippingAddress.phone}</p>
                          <p className="text-[#555]">
                            {order.shippingAddress.addressLine1}
                            {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                          </p>
                          <p className="text-[#555]">
                            {order.shippingAddress.district} {order.shippingAddress.province} {order.shippingAddress.postalCode}
                          </p>
                          {order.shippingAddress.note && (
                            <p className="text-xs text-[#9a9590] mt-1">หมายเหตุ: {order.shippingAddress.note}</p>
                          )}
                        </div>
                      )}
                      {order.deliveryMethod === "MEETUP" && (order.meetupLocation || order.meetupDateTime) && (
                        <div className="bg-white border border-[#e5e3de] rounded-xl px-4 py-3 text-sm">
                          <p className="text-[#999] text-xs font-semibold uppercase tracking-wide mb-2">นัดพบ</p>
                          {order.meetupLocation && (
                            <p className="text-[#333]">📍 {order.meetupLocation}</p>
                          )}
                          {order.meetupDateTime && (
                            <p className="text-[#555] text-xs mt-0.5">
                              🕐 {new Date(order.meetupDateTime).toLocaleString("th-TH", {
                                dateStyle: "medium", timeStyle: "short",
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Actions dropdown ─────────────────────────────────────────────────────────

function OrderActionsDropdown({
  order, onComplete, onCancel,
}: {
  order:      OrderRow;
  onComplete: () => void;
  onCancel:   () => void;
}) {
  const [open, setOpen] = useState(false);

  // Statuses where admin can force-complete (release funds to seller)
  const canComplete = [
    "FUNDS_HELD", "SHIPPED", "DISPUTED",
    "PENDING_CONFIRMATION", "DELIVERED",
    "MEETUP_SCHEDULED", "AWAITING_SHIPMENT", "COD_SHIPPED", "MEETUP_ARRANGED",
  ].includes(order.status);

  // Statuses where admin can cancel + refund (or just cancel for COD)
  const canCancel = [
    "FUNDS_HELD", "SHIPPED", "DISPUTED",
    "PENDING_CONFIRMATION", "DELIVERED",
    "MEETUP_SCHEDULED", "AWAITING_SHIPMENT", "COD_SHIPPED", "MEETUP_ARRANGED",
  ].includes(order.status);

  if (!canComplete && !canCancel) {
    return <div className="w-8 h-8" />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e5e3de] transition text-[#555]"
        aria-label="เมนูการจัดการ"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-44 bg-white rounded-xl border border-[#e5e3de] shadow-lg py-1">
            {canComplete && (
              <button
                onClick={() => { setOpen(false); onComplete(); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-green-700 transition"
              >
                ✅ บังคับให้สำเร็จ
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => { setOpen(false); onCancel(); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] text-red-600 transition"
              >
                ❌ ยกเลิกและคืนเงิน
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Delivery Method Badge ────────────────────────────────────────────────────

function DeliveryMethodBadge({
  delivery,
  payment,
}: {
  delivery: string | null;
  payment:  string | null;
}) {
  if (!delivery && !payment) {
    return <span className="text-xs text-[#bbb]">—</span>;
  }

  const deliveryLabel: Record<string, string> = {
    SHIPPING: "🚚 ส่งพัสดุ",
    MEETUP:   "🤝 นัดพบ",
  };
  const paymentLabel: Record<string, string> = {
    ESCROW: "🔒 Escrow",
    COD:    "💵 COD",
  };

  return (
    <div className="flex flex-col gap-0.5">
      {delivery && (
        <span className="text-xs text-[#444] whitespace-nowrap">
          {deliveryLabel[delivery] ?? delivery}
        </span>
      )}
      {payment && (
        <span className="text-xs text-[#777] whitespace-nowrap">
          {paymentLabel[payment] ?? payment}
        </span>
      )}
    </div>
  );
}
