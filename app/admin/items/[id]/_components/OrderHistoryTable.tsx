import { getTr } from "@/lib/i18n/server";
import Link from "next/link";
import StatusBadge from "../../../_components/StatusBadge";
import { formatThaiDate, formatCurrency, truncateId } from "../../../_lib/utils";

const PAYMENT_METHOD_TH: Record<string, { label: string; cls: string }> = {
  ESCROW: { label: "Escrow", cls: "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[var(--c-line-str)]" },
  COD:    { label: "COD",    cls: "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]" },
};

const DELIVERY_METHOD_TH: Record<string, { label: string; cls: string }> = {
  SHIPPING: { label: "จัดส่ง", cls: "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[var(--c-line-str)]" },
  MEETUP:   { label: "นัดรับ", cls: "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]" },
};

interface Props {
  orders: Array<{
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    amount: number;
    totalAmount: number | null;
    paymentMethod: string | null;
    deliveryMethod: string | null;
    status: string;
    createdAt: string;
  }>;
}

export default async function OrderHistoryTable({ orders }: Props) {
  const tr = await getTr();
  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6">
      <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-4">
        ประวัติคำสั่งซื้อ
        {orders.length > 0 && (
          <span className="text-[var(--c-faint)] font-normal ml-1">({orders.length})</span>
        )}
      </h3>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-[var(--c-faint)] text-sm">
          <span className="text-3xl block mb-2">📦</span>{tr("ยังไม่มีคำสั่งซื้อสำหรับสินค้านี้")}</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--c-line)]">
                <th className="text-left py-2 text-[var(--c-faint)] font-medium text-xs">{tr("รหัส")}</th>
                <th className="text-left py-2 text-[var(--c-faint)] font-medium text-xs">{tr("ผู้ซื้อ")}</th>
                <th className="text-right py-2 text-[var(--c-faint)] font-medium text-xs">{tr("จำนวนเงิน")}</th>
                <th className="text-center py-2 text-[var(--c-faint)] font-medium text-xs">{tr("ชำระ")}</th>
                <th className="text-center py-2 text-[var(--c-faint)] font-medium text-xs">{tr("จัดส่ง")}</th>
                <th className="text-center py-2 text-[var(--c-faint)] font-medium text-xs">{tr("สถานะ")}</th>
                <th className="text-right py-2 text-[var(--c-faint)] font-medium text-xs">{tr("วันที่")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line-soft)]">
              {orders.map((order) => {
                const payment = order.paymentMethod
                  ? PAYMENT_METHOD_TH[order.paymentMethod] ?? { label: order.paymentMethod, cls: "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]" }
                  : null;
                const delivery = order.deliveryMethod
                  ? DELIVERY_METHOD_TH[order.deliveryMethod] ?? { label: order.deliveryMethod, cls: "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]" }
                  : null;

                return (
                  <tr key={order.id} className="hover:bg-[var(--c-subtle)] transition">
                    <td className="py-2.5">
                      <Link
                        href={`/admin/orders?search=${order.id}`}
                        className="text-[var(--c-accent)] hover:underline font-mono text-xs"
                      >
                        {truncateId(order.id)}
                      </Link>
                    </td>
                    <td className="py-2.5">
                      <p className="text-[var(--c-ink-1)] truncate max-w-[120px]">{order.buyerName ?? "—"}</p>
                      <p className="text-[10px] text-[var(--c-faint)] truncate max-w-[120px]">{order.buyerEmail}</p>
                    </td>
                    <td className="py-2.5 text-right font-medium text-[var(--c-ink-1)] whitespace-nowrap">
                      {formatCurrency(order.totalAmount ?? order.amount)}
                    </td>
                    <td className="py-2.5 text-center">
                      {payment ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${payment.cls}`}>
                          {tr(payment.label)}
                        </span>
                      ) : (
                        <span className="text-[var(--c-faint)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {delivery ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${delivery.cls}`}>
                          {tr(delivery.label)}
                        </span>
                      ) : (
                        <span className="text-[var(--c-faint)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      <StatusBadge status={order.status} type="order" />
                    </td>
                    <td className="py-2.5 text-right text-[var(--c-ink-3)] whitespace-nowrap text-xs">
                      {formatThaiDate(order.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
