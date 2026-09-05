import Link from "next/link";
import StatusBadge from "../../../_components/StatusBadge";
import { formatThaiDate, formatCurrency, truncateId } from "../../../_lib/utils";

const PAYMENT_METHOD_TH: Record<string, { label: string; cls: string }> = {
  ESCROW: { label: "Escrow", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  COD:    { label: "COD",    cls: "bg-gray-50 text-gray-600 border-gray-200" },
};

const DELIVERY_METHOD_TH: Record<string, { label: string; cls: string }> = {
  SHIPPING: { label: "จัดส่ง", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  MEETUP:   { label: "นัดรับ", cls: "bg-green-50 text-green-700 border-green-200" },
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

export default function OrderHistoryTable({ orders }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-[#dfe7f2] p-6">
      <h3 className="text-sm font-semibold text-[#3d4d66] mb-4">
        ประวัติคำสั่งซื้อ
        {orders.length > 0 && (
          <span className="text-[#94a3b8] font-normal ml-1">({orders.length})</span>
        )}
      </h3>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-[#94a3b8] text-sm">
          <span className="text-3xl block mb-2">📦</span>
          ยังไม่มีคำสั่งซื้อสำหรับสินค้านี้
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#dfe7f2]">
                <th className="text-left py-2 text-[#8494a9] font-medium text-xs">รหัส</th>
                <th className="text-left py-2 text-[#8494a9] font-medium text-xs">ผู้ซื้อ</th>
                <th className="text-right py-2 text-[#8494a9] font-medium text-xs">จำนวนเงิน</th>
                <th className="text-center py-2 text-[#8494a9] font-medium text-xs">ชำระ</th>
                <th className="text-center py-2 text-[#8494a9] font-medium text-xs">จัดส่ง</th>
                <th className="text-center py-2 text-[#8494a9] font-medium text-xs">สถานะ</th>
                <th className="text-right py-2 text-[#8494a9] font-medium text-xs">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf0f8]">
              {orders.map((order) => {
                const payment = order.paymentMethod
                  ? PAYMENT_METHOD_TH[order.paymentMethod] ?? { label: order.paymentMethod, cls: "bg-gray-50 text-gray-600 border-gray-200" }
                  : null;
                const delivery = order.deliveryMethod
                  ? DELIVERY_METHOD_TH[order.deliveryMethod] ?? { label: order.deliveryMethod, cls: "bg-gray-50 text-gray-600 border-gray-200" }
                  : null;

                return (
                  <tr key={order.id} className="hover:bg-[#f7f9fd] transition">
                    <td className="py-2.5">
                      <Link
                        href={`/admin/orders?search=${order.id}`}
                        className="text-[#2563eb] hover:underline font-mono text-xs"
                      >
                        {truncateId(order.id)}
                      </Link>
                    </td>
                    <td className="py-2.5">
                      <p className="text-[#1e2d47] truncate max-w-[120px]">{order.buyerName ?? "—"}</p>
                      <p className="text-[10px] text-[#94a3b8] truncate max-w-[120px]">{order.buyerEmail}</p>
                    </td>
                    <td className="py-2.5 text-right font-medium text-[#1e2d47] whitespace-nowrap">
                      {formatCurrency(order.totalAmount ?? order.amount)}
                    </td>
                    <td className="py-2.5 text-center">
                      {payment ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${payment.cls}`}>
                          {payment.label}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {delivery ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${delivery.cls}`}>
                          {delivery.label}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      <StatusBadge status={order.status} type="order" />
                    </td>
                    <td className="py-2.5 text-right text-[#5b6b82] whitespace-nowrap text-xs">
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
