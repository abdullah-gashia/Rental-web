import Link from "next/link";
import { getOfficeOrders } from "@/lib/actions/borrow-orders";
import { BORROW_STATUS_LABEL, BORROW_CATEGORY_LABEL } from "@/lib/borrow-config";

export const dynamic  = "force-dynamic";
export const metadata = { title: "รายการยืม | งานภัทร" };

const PILL: Record<string, string> = {
  REQUESTED: "bw-pill-wait", RENEWAL_REQUESTED: "bw-pill-wait", RETURN_REQUESTED: "bw-pill-wait",
  APPROVED: "bw-pill-go", PICKUP_SCHEDULED: "bw-pill-go", RETURN_SCHEDULED: "bw-pill-go",
  ITEM_HANDED_OVER: "bw-pill-go", RETURNED: "bw-pill-go",
  ACTIVE: "bw-pill-live", RENEWED: "bw-pill-live",
  OVERDUE: "bw-pill-late", LOST: "bw-pill-late", DISPUTED: "bw-pill-late",
  COMPLETED: "bw-pill-done", COMPLETED_WITH_DEDUCTION: "bw-pill-done",
  REJECTED: "bw-pill-off", CANCELLED: "bw-pill-off",
};

const FILTERS = [
  { key: "",        label: "ทั้งหมด" },
  { key: "waiting", label: "รออนุมัติ" },
  { key: "active",  label: "กำลังยืม" },
  { key: "overdue", label: "เกินกำหนด" },
  { key: "done",    label: "จบแล้ว" },
];

export default async function OfficeOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const orders = await getOfficeOrders(f);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--psu-navy)]">รายการยืม</h1>
        <p className="text-[13px] text-[var(--bw-muted)] mt-1">
          ทุกรายการที่งานภัทรให้ยืม พร้อมสถานะและกำหนดคืน
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={x.key ? `/pattara/orders?f=${x.key}` : "/pattara/orders"}
            className={`bw-pill !text-[12px] !px-3.5 !py-1.5 ${(f ?? "") === x.key ? "bw-pill-go" : "bw-pill-done"}`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bw-panel text-center py-16">
          <p className="text-[14px] text-[var(--bw-muted)]">ไม่มีรายการในหมวดนี้</p>
        </div>
      ) : (
        <div className="bw-panel !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[var(--bw-ground)] border-b border-[var(--bw-line)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">อุปกรณ์</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">ผู้ยืม</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">สถานะ</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--bw-ink-2)]">กำหนดคืน</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--bw-ink-2)]"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const left = o.dueDate
                    ? Math.ceil((new Date(o.dueDate).getTime() - Date.now()) / 86_400_000)
                    : null;
                  return (
                    <tr key={o.id} className="border-b border-[var(--bw-line)] last:border-0 hover:bg-[var(--bw-tint)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="bw-thumb w-10 h-10 flex-shrink-0">
                            {o.item.images?.[0] ? <img src={o.item.images[0]} alt="" /> : <span className="text-sm opacity-30">📦</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{o.item.title}</p>
                            <p className="text-[11px] text-[var(--bw-muted)]">
                              {BORROW_CATEGORY_LABEL[o.item.category] ?? o.item.category} · {o.requestedDays} วัน
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate max-w-[160px]">{o.borrower?.name ?? "—"}</p>
                        <p className="text-[11px] text-[var(--bw-muted)] truncate max-w-[160px]">{o.borrower?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`bw-pill ${PILL[o.status] ?? "bw-pill-off"}`}>
                          {BORROW_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {o.dueDate ? (
                          <>
                            <p className="bw-num">{new Date(o.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</p>
                            <p className={`text-[11px] ${left !== null && left < 0 ? "text-[var(--c-danger)] font-semibold" : "text-[var(--bw-muted)]"}`}>
                              {left === null ? "" : left < 0 ? `เลย ${Math.abs(left)} วัน` : left === 0 ? "วันนี้" : `อีก ${left} วัน`}
                            </p>
                          </>
                        ) : <span className="text-[var(--bw-muted)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/pattara/orders/${o.id}`} className="text-[12px] font-semibold text-[var(--psu-blue)] hover:underline whitespace-nowrap">
                          จัดการ →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
