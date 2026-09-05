"use client";

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
  FUNDS_HELD:        { label: "ชำระแล้ว",         cls: "bg-blue-50   text-blue-700   border-blue-200"  },
  SHIPPED:           { label: "จัดส่งแล้ว",        cls: "bg-indigo-50 text-indigo-700 border-indigo-200"},
  COMPLETED:         { label: "สำเร็จ",            cls: "bg-green-50  text-green-700  border-green-200" },
  DISPUTED:          { label: "มีข้อพิพาท",        cls: "bg-orange-50 text-orange-700 border-orange-200"},
  REFUNDED:          { label: "คืนเงินแล้ว",       cls: "bg-purple-50 text-purple-700 border-purple-200"},
  CANCELLED:         { label: "ยกเลิก",            cls: "bg-red-50    text-red-700    border-red-200"   },
  CANCELLED_BY_ADMIN:{ label: "ยกเลิกโดยแอดมิน",  cls: "bg-red-50    text-red-700    border-red-200"   },
};

function formatBaht(v: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", maximumFractionDigits: 0,
  }).format(v);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return "เมื่อกี้";
  if (mins < 60)  return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} ชม. ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days} วันที่แล้ว`;
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(iso));
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#dfe7f2] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[#1e2d47] mb-4">รายการล่าสุด</h3>
        <p className="text-sm text-[#64748b] text-center py-8">ยังไม่มีรายการ</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#dfe7f2] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#dfe7f2]">
        <h3 className="text-sm font-semibold text-[#1e2d47]">รายการล่าสุด</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="รายการ Escrow ล่าสุด">
          <thead>
            <tr className="border-b border-[#dfe7f2] bg-[#f1f5fb]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-[#5b6b82] uppercase tracking-wide">
                รหัสคำสั่ง
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[#5b6b82] uppercase tracking-wide">
                จำนวนเงิน
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-[#5b6b82] uppercase tracking-wide">
                สถานะ
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[#5b6b82] uppercase tracking-wide">
                วันที่
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const meta = STATUS_META[order.status] ?? {
                label: order.status,
                cls:   "bg-gray-50 text-gray-700 border-gray-200",
              };
              return (
                <tr
                  key={order.id}
                  className={`border-b border-[#eaf0f8] hover:bg-[#f7f9fd] transition-colors ${
                    idx === orders.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  {/* Order ID — show last 8 chars to keep it short */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-[#3d4d66] bg-[#eaf0f8] px-2 py-0.5 rounded-lg">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right font-semibold text-[#0f1e35] tabular-nums">
                    {formatBaht(order.amount)}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right text-xs text-[#64748b] whitespace-nowrap">
                    {relativeTime(order.createdAt)}
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
