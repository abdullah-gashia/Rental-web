"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import type { TrFn } from "@/lib/i18n/phrases";

interface Order {
  id:        string;
  amount:    number;
  status:    string;
  createdAt: string; // ISO string
}

interface RecentOrdersTableProps {
  orders: Order[];
}

// Status → Thai label + Tailwind badge classes
const STATUS_META: Record<string, { label: string; cls: string }> = {
  FUNDS_HELD:        { label: "ชำระแล้ว",         cls: "bg-[var(--c-accent-soft)]   text-[var(--c-accent-str)]   border-[var(--c-line-str)]"  },
  SHIPPED:           { label: "จัดส่งแล้ว",        cls: "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-indigo-200"},
  COMPLETED:         { label: "สำเร็จ",            cls: "bg-[var(--c-ok-soft)]  text-[var(--c-ok)]  border-[var(--c-ok-line)]" },
  DISPUTED:          { label: "มีข้อพิพาท",        cls: "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]"},
  REFUNDED:          { label: "คืนเงินแล้ว",       cls: "bg-purple-50 text-purple-700 border-purple-200"},
  CANCELLED:         { label: "ยกเลิก",            cls: "bg-[var(--c-danger-soft)]    text-[var(--c-danger)]    border-[var(--c-danger-line)]"   },
  CANCELLED_BY_ADMIN:{ label: "ยกเลิกโดยแอดมิน",  cls: "bg-[var(--c-danger-soft)]    text-[var(--c-danger)]    border-[var(--c-danger-line)]"   },
};

function formatBaht(v: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", maximumFractionDigits: 0,
  }).format(v);
}

function relativeTime(iso: string, tr: TrFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return tr("เมื่อกี้");
  if (mins < 60)  return tr("{0} นาทีที่แล้ว", [mins]);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return tr("{0} ชม. ที่แล้ว", [hrs]);
  const days = Math.floor(hrs / 24);
  if (days < 30)  return tr("{0} วันที่แล้ว", [days]);
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(iso));
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const tr = useLocaleStore((s) => s.tr);
  if (orders.length === 0) {
    return (
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--c-ink-1)] mb-4">{tr("รายการล่าสุด")}</h3>
        <p className="text-sm text-[var(--c-muted)] text-center py-8">{tr("ยังไม่มีรายการ")}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--c-line)]">
        <h3 className="text-sm font-semibold text-[var(--c-ink-1)]">{tr("รายการล่าสุด")}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={tr("รายการ Escrow ล่าสุด")}>
          <thead>
            <tr className="border-b border-[var(--c-line)] bg-[var(--c-canvas)]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">{tr("รหัสคำสั่ง")}</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">{tr("จำนวนเงิน")}</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">{tr("สถานะ")}</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--c-ink-3)] uppercase tracking-wide">{tr("วันที่")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const meta = STATUS_META[order.status] ?? {
                label: order.status,
                cls:   "bg-[var(--c-subtle)] text-[var(--c-ink-2)] border-[var(--c-line)]",
              };
              return (
                <tr
                  key={order.id}
                  className={`border-b border-[var(--c-line-soft)] hover:bg-[var(--c-subtle)] transition-colors ${
                    idx === orders.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  {/* Order ID — show last 8 chars to keep it short */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-[var(--c-ink-2)] bg-[var(--c-line-soft)] px-2 py-0.5 rounded-lg">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right font-semibold text-[var(--c-ink)] tabular-nums">
                    {formatBaht(order.amount)}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}
                    >
                      {tr(meta.label)}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right text-xs text-[var(--c-muted)] whitespace-nowrap">
                    {relativeTime(order.createdAt, tr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
