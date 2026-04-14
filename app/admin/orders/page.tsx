import { Suspense }   from "react";
import { getOrders }  from "./actions";
import OrdersTable    from "./_components/OrdersTable";
import SearchInput    from "../_components/SearchInput";
import Pagination     from "../_components/Pagination";
import FilterSelect   from "../_components/FilterSelect";
import StatusGroupTabs from "./_components/StatusGroupTabs";
import { safeInt, safeStr } from "../_lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams;

  const params = {
    page:        safeInt(safeStr(sp.page), 1),
    pageSize:    20,
    search:      safeStr(sp.search),
    sortBy:      safeStr(sp.sortBy)    || "createdAt",
    sortOrder:   (safeStr(sp.sortOrder) || "desc") as "asc" | "desc",
    status:      safeStr(sp.status),
    statusGroup: safeStr(sp.statusGroup),
  };

  const result = await getOrders(params);
  const activeGroup = safeStr(sp.statusGroup) || "all";

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-[#111]">รายการสั่งซื้อ</h1>
        <p className="text-sm text-[#777] mt-0.5">ติดตามและจัดการคำสั่งซื้อทั้งหมด</p>
      </div>

      {/* Quick-filter tabs */}
      <Suspense fallback={null}>
        <StatusGroupTabs active={activeGroup} />
      </Suspense>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-64">
          <Suspense fallback={null}>
            <SearchInput placeholder="ค้นหาผู้ซื้อ / ผู้ขาย / สินค้า..." />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <FilterSelect
            name="status"
            options={[
              { value: "",                      label: "ทุกสถานะ"               },
              // ── Checkout wizard ──
              { value: "PENDING_CONFIRMATION",  label: "รอยืนยัน"               },
              { value: "AWAITING_SHIPMENT",     label: "รอจัดส่ง"               },
              { value: "MEETUP_ARRANGED",       label: "นัดพบ (COD)"            },
              // ── In-progress ──
              { value: "FUNDS_HELD",            label: "กักเงินแล้ว"            },
              { value: "SHIPPED",               label: "จัดส่งแล้ว"             },
              { value: "COD_SHIPPED",           label: "จัดส่งแล้ว (COD)"       },
              { value: "MEETUP_SCHEDULED",      label: "นัดพบแล้ว"              },
              { value: "DELIVERED",             label: "รับสินค้าแล้ว"          },
              // ── Completed ──
              { value: "COMPLETED",             label: "สำเร็จ"                  },
              { value: "MEETUP_COMPLETED",      label: "พบกันสำเร็จ"            },
              { value: "COD_DELIVERED",         label: "รับ COD แล้ว"           },
              { value: "MEETUP_CASH_COMPLETED", label: "พบกัน + รับเงิน"        },
              { value: "REFUNDED",              label: "คืนเงินแล้ว"            },
              // ── Problem ──
              { value: "DISPUTED",              label: "มีข้อพิพาท"             },
              { value: "CANCELLED",             label: "ยกเลิก"                 },
              { value: "CANCELLED_BY_ADMIN",    label: "ยกเลิกโดยแอดมิน"       },
            ]}
          />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden">
        <OrdersTable rows={result.data} />
      </div>

      {/* Pagination */}
      <Suspense fallback={null}>
        <Pagination meta={result.meta} />
      </Suspense>
    </div>
  );
}

