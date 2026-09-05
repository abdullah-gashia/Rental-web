"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import type { UserDetail } from "../../_lib/types";
import StatusBadge          from "../../_components/StatusBadge";

interface Props {
  data: UserDetail;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function FinancialSummary({ data }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const hasEscrow = data.escrowOrders.length > 0;

  return (
    <div className="p-4 bg-[var(--c-subtle)] rounded-xl border border-[var(--c-line)] space-y-3">
      <h3 className="text-xs font-semibold text-[var(--c-ink-2)] uppercase tracking-wider flex items-center gap-1.5">{tr("💰 สรุปการเงิน")}</h3>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <FinRow
          label={tr("กระเป๋าเงิน")}
          amount={data.walletBalance}
          badge={tr("พร้อมใช้งาน")}
          badgeColor="green"
        />
        <FinRow
          label={tr("Escrow คงค้าง (ผู้ซื้อ)")}
          amount={data.buyerEscrowTotal}
          badge={tr("{0} รายการ", [data.buyerEscrowCount])}
          badgeColor={data.buyerEscrowCount > 0 ? "yellow" : "gray"}
        />
        <FinRow
          label={tr("รอจ่ายออก (ผู้ขาย)")}
          amount={data.sellerPayoutTotal}
          badge={tr("{0} รายการ", [data.sellerPayoutCount])}
          badgeColor={data.sellerPayoutCount > 0 ? "blue" : "gray"}
        />
        <FinRow
          label={tr("ยอดขายทั้งหมด")}
          amount={data.totalSalesAmount}
          badge={tr("{0} ออเดอร์", [data.totalSalesCount])}
          badgeColor="gray"
        />
        <FinRow
          label={tr("ยอดซื้อทั้งหมด")}
          amount={data.totalPurchaseAmount}
          badge={tr("{0} ออเดอร์", [data.totalPurchaseCount])}
          badgeColor="gray"
        />
      </div>

      {/* Escrow order details */}
      {hasEscrow && (
        <div className="border-t border-[var(--c-line)] pt-3">
          <p className="text-xs font-medium text-[var(--c-ink-3)] mb-2 flex items-center gap-1">{tr("⚠️ รายการ Escrow ที่ยังดำเนินอยู่:")}</p>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {data.escrowOrders.map((order) => {
              const isBuyer = order.buyerId === data.id;
              const role    = isBuyer ? "ผู้ซื้อ" : "ผู้ขาย";
              const amount  = isBuyer
                ? (order.totalAmount ?? order.amount)
                : (order.sellerPayout ?? order.amount);

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between text-sm py-2 px-2 rounded-lg hover:bg-[var(--c-surface)] transition"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[var(--c-muted)] bg-[var(--c-line-soft)] px-1.5 py-0.5 rounded mr-1.5">
                      {role}
                    </span>
                    <span className="text-[var(--c-ink-1)] text-xs truncate">
                      {order.itemTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-medium text-[var(--c-ink-1)]">
                      ฿{fmt(amount)}
                    </span>
                    <StatusBadge status={order.status} type="order" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Financial stat row ───────────────────────────────────────────────────────

function FinRow({
  label, amount, badge, badgeColor,
}: {
  label: string;
  amount: number;
  badge: string;
  badgeColor: string;
}) {
  const colors: Record<string, string> = {
    green:  "text-[var(--c-ok)] bg-[var(--c-ok-soft)]",
    yellow: "text-[var(--c-warn)] bg-[var(--c-warn-soft)]",
    blue:   "text-[var(--c-accent-str)] bg-[var(--c-accent-soft)]",
    gray:   "text-[var(--c-muted)] bg-[var(--c-subtle)]",
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-[var(--c-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--c-ink)]">฿{fmt(amount)}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[badgeColor] ?? colors.gray}`}>
        {badge}
      </span>
    </div>
  );
}
