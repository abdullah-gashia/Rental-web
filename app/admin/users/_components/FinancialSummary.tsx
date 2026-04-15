"use client";

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
  const hasEscrow = data.escrowOrders.length > 0;

  return (
    <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#e5e3de] space-y-3">
      <h3 className="text-xs font-semibold text-[#555] uppercase tracking-wider flex items-center gap-1.5">
        💰 สรุปการเงิน
      </h3>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <FinRow
          label="กระเป๋าเงิน"
          amount={data.walletBalance}
          badge="พร้อมใช้งาน"
          badgeColor="green"
        />
        <FinRow
          label="Escrow คงค้าง (ผู้ซื้อ)"
          amount={data.buyerEscrowTotal}
          badge={`${data.buyerEscrowCount} รายการ`}
          badgeColor={data.buyerEscrowCount > 0 ? "yellow" : "gray"}
        />
        <FinRow
          label="รอจ่ายออก (ผู้ขาย)"
          amount={data.sellerPayoutTotal}
          badge={`${data.sellerPayoutCount} รายการ`}
          badgeColor={data.sellerPayoutCount > 0 ? "blue" : "gray"}
        />
        <FinRow
          label="ยอดขายทั้งหมด"
          amount={data.totalSalesAmount}
          badge={`${data.totalSalesCount} ออเดอร์`}
          badgeColor="gray"
        />
        <FinRow
          label="ยอดซื้อทั้งหมด"
          amount={data.totalPurchaseAmount}
          badge={`${data.totalPurchaseCount} ออเดอร์`}
          badgeColor="gray"
        />
      </div>

      {/* Escrow order details */}
      {hasEscrow && (
        <div className="border-t border-[#e5e3de] pt-3">
          <p className="text-xs font-medium text-[#777] mb-2 flex items-center gap-1">
            ⚠️ รายการ Escrow ที่ยังดำเนินอยู่:
          </p>
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
                  className="flex items-center justify-between text-sm py-2 px-2 rounded-lg hover:bg-white transition"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-[#9a9590] bg-[#f0ede7] px-1.5 py-0.5 rounded mr-1.5">
                      {role}
                    </span>
                    <span className="text-[#333] text-xs truncate">
                      {order.itemTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-medium text-[#333]">
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
    green:  "text-green-700 bg-green-50",
    yellow: "text-yellow-700 bg-yellow-50",
    blue:   "text-blue-700 bg-blue-50",
    gray:   "text-gray-500 bg-gray-50",
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-[#9a9590]">{label}</p>
        <p className="text-sm font-semibold text-[#111]">฿{fmt(amount)}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[badgeColor] ?? colors.gray}`}>
        {badge}
      </span>
    </div>
  );
}
