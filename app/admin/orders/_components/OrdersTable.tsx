"use client";

import { Fragment, useState, useTransition } from "react";
import Image                        from "next/image";
import type { OrderRow }            from "../../_lib/types";
import { formatThaiDate, formatRelativeDate, formatCurrency, truncateId } from "../../_lib/utils";
import { useLocale, useT, useTr } from "@/lib/i18n/LocaleProvider";
import { orderStatus } from "@/lib/i18n/labels";
import StatusBadge                  from "../../_components/StatusBadge";
import ConfirmDialog                from "../../_components/ConfirmDialog";
import { forceCompleteOrder, forceCancelOrder } from "../actions";

interface Props {
  rows: OrderRow[];
}

export default function OrdersTable({ rows }: Props) {
  const tr = useTr();
  const [pending, startTransition] = useTransition();

  type DialogKind = "complete" | "cancel";
  const [dialog, setDialog] = useState<{
    kind:    DialogKind;
    orderId: string;
    ref:     string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const t      = useT();
  const locale = useLocale();
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
      showToast(res.success, res.success ? tr(res.message) : tr(res.error));
    });
  }

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center text-[var(--c-faint)] text-sm">{tr("ไม่พบรายการสั่งซื้อ")}</div>
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
        title={dialog?.kind === "complete" ? tr("บังคับให้คำสั่งซื้อสำเร็จ?") : tr("ยกเลิกคำสั่งซื้อ?")}
        description={
          dialog?.kind === "complete"
            ? tr("คำสั่งซื้อ {0} จะถูกทำเครื่องหมายว่าสำเร็จ และเงินจะถูกปล่อยให้ผู้ขาย", [dialog?.ref])
            : tr("คำสั่งซื้อ {0} จะถูกยกเลิก และเงินจะถูกคืนให้ผู้ซื้อ กรุณาระบุเหตุผล", [dialog?.ref])
        }
        confirmLabel={dialog?.kind === "complete" ? tr("บังคับสำเร็จ") : tr("ยกเลิก")}
        danger={dialog?.kind === "cancel"}
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => { setDialog(null); setCancelReason(""); }}
      >
        {dialog?.kind === "cancel" && (
          <textarea
            className="w-full border border-[var(--c-line)] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
            placeholder={tr("เหตุผลในการยกเลิก...")}
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        )}
      </ConfirmDialog>

      {/* Table
          Seven columns, sized to fit. Anything that used to need a sideways
          drag is now paired with the fact it belongs to. */}
      <div>
        <table className="ui-table table-fixed">
          <colgroup>
            <col className="w-9" />
            <col />
            <col className="w-[22%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>{t("ad_col_item")}</th>
              <th>{t("ad_col_parties")}</th>
              <th className="!text-right">{t("ad_col_amount")}</th>
              <th>{t("ad_col_delivery")}</th>
              <th>{t("ad_col_status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              // A shorthand fragment cannot carry a key, so React saw a list of
              // unkeyed children however well the rows inside were keyed.
              <Fragment key={order.id}>
                <tr
                  className="cursor-pointer"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  {/* Expand toggle */}
                  <td className="!pr-0 text-[var(--hp-muted)]">
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${expanded === order.id ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>

                  {/* Item — the title opens the listing, which is what an
                      admin reaching for it actually wants. */}
                  <td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="ui-thumb w-9 h-9">
                        {order.item.thumbnailUrl ? (
                          <Image
                            src={order.item.thumbnailUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="object-contain w-full h-full"
                          />
                        ) : (
                          <span className="text-[13px] opacity-40">📦</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`/admin/items/${order.item.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate font-medium text-[var(--hp-ink)] hover:text-[var(--psu-blue)] hover:underline"
                          title={order.item.title}
                        >
                          {order.item.title}
                        </a>
                        <p className="ui-num text-[11px] text-[var(--hp-muted)] font-mono">
                          #{order.shortRef}
                          {order.hasDispute && (
                            <span className="ml-1.5 text-[var(--c-danger)]">
                              · {t("ad_dispute_flag")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Both parties in one column */}
                  <td>
                    <p className="truncate text-[var(--hp-ink)]" title={order.buyer.email}>
                      {order.buyer.name ?? order.buyer.email}
                    </p>
                    <p className="truncate text-[11.5px] text-[var(--hp-muted)]" title={order.seller.email}>
                      → {order.seller.name ?? order.seller.email}
                    </p>
                  </td>

                  {/* Amount */}
                  <td className="text-right font-semibold text-[var(--hp-ink)] whitespace-nowrap ui-num">
                    {formatCurrency(order.totalAmount ?? order.amount)}
                  </td>

                  {/* Delivery / Payment */}
                  <td>
                    <DeliveryMethodBadge delivery={order.deliveryMethod} payment={order.paymentMethod} />
                  </td>

                  {/* Status, with the date under it */}
                  <td>
                    <StatusBadge status={order.status} type="order" />
                    <p className="text-[11.5px] text-[var(--hp-muted)] mt-1">
                      {formatRelativeDate(order.createdAt)}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="!px-2" onClick={(e) => e.stopPropagation()}>
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
                  <tr className="bg-[var(--hp-subtle)]">
                    <td colSpan={7} className="px-8 py-4 space-y-4">
                      {/* Core IDs + dates */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--c-faint)] text-xs mb-1">{tr("รหัสเต็ม")}</p>
                          <p className="font-mono text-xs text-[var(--c-ink-1)]">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-[var(--c-faint)] text-xs mb-1">{tr("สินค้า ID")}</p>
                          <a
                            href={`/items/${order.item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-[var(--c-accent)] hover:underline"
                          >
                            {truncateId(order.item.id)}
                          </a>
                        </div>
                        <div>
                          <p className="text-[var(--c-faint)] text-xs mb-1">{tr("วันที่สั่งซื้อ")}</p>
                          <p className="text-[var(--c-ink-1)]">{formatThaiDate(order.createdAt)}</p>
                        </div>
                        {order.shippedAt && (
                          <div>
                            <p className="text-[var(--c-faint)] text-xs mb-1">{tr("วันที่จัดส่ง")}</p>
                            <p className="text-[var(--c-ink-1)]">{formatThaiDate(order.shippedAt)}</p>
                          </div>
                        )}
                        {order.trackingNumber && (
                          <div>
                            <p className="text-[var(--c-faint)] text-xs mb-1">{tr("เลขพัสดุ")}</p>
                            <p className="font-mono text-xs text-[var(--c-ink-1)]">{order.trackingNumber}</p>
                          </div>
                        )}
                      </div>

                      {/* Delivery details */}
                      {order.deliveryMethod === "SHIPPING" && order.shippingAddress && (
                        <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm">
                          <p className="text-[var(--c-faint)] text-xs font-semibold uppercase tracking-wide mb-2">{tr("ที่อยู่จัดส่ง")}</p>
                          <p className="font-medium text-[var(--c-ink)]">{order.shippingAddress.recipientName}</p>
                          <p className="text-[var(--c-ink-2)]">{order.shippingAddress.phone}</p>
                          <p className="text-[var(--c-ink-2)]">
                            {order.shippingAddress.addressLine1}
                            {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                          </p>
                          <p className="text-[var(--c-ink-2)]">
                            {order.shippingAddress.district} {order.shippingAddress.province} {order.shippingAddress.postalCode}
                          </p>
                          {order.shippingAddress.note && (
                            <p className="text-xs text-[var(--c-muted)] mt-1">{tr("หมายเหตุ: {0}", [order.shippingAddress.note])}</p>
                          )}
                        </div>
                      )}
                      {order.deliveryMethod === "MEETUP" && (order.meetupLocation || order.meetupDateTime) && (
                        <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm">
                          <p className="text-[var(--c-faint)] text-xs font-semibold uppercase tracking-wide mb-2">{tr("นัดพบ")}</p>
                          {order.meetupLocation && (
                            <p className="text-[var(--c-ink-1)]">📍 {order.meetupLocation}</p>
                          )}
                          {order.meetupDateTime && (
                            <p className="text-[var(--c-ink-2)] text-xs mt-0.5">
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
              </Fragment>
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
  const tr = useTr();
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
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-line)] transition text-[var(--c-ink-2)]"
        aria-label={tr("เมนูการจัดการ")}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-44 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] shadow-lg py-1">
            {canComplete && (
              <button
                onClick={() => { setOpen(false); onComplete(); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--c-canvas)] text-[var(--c-ok)] transition"
              >{tr("✅ บังคับให้สำเร็จ")}</button>
            )}
            {canCancel && (
              <button
                onClick={() => { setOpen(false); onCancel(); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--c-canvas)] text-[var(--c-danger)] transition"
              >{tr("❌ ยกเลิกและคืนเงิน")}</button>
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
  const tr = useTr();
  if (!delivery && !payment) {
    return <span className="text-xs text-[var(--c-faint-2)]">—</span>;
  }

  const deliveryLabel: Record<string, string> = {
    SHIPPING: tr("🚚 ส่งพัสดุ"),
    MEETUP:   tr("🤝 นัดพบ"),
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
        <span className="text-xs text-[var(--c-ink-3)] whitespace-nowrap">
          {paymentLabel[payment] ?? payment}
        </span>
      )}
    </div>
  );
}
