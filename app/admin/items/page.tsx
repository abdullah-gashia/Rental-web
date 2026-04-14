import { Suspense }   from "react";
import { getItems }   from "./actions";
import ItemsTable     from "./_components/ItemsTable";
import SearchInput    from "../_components/SearchInput";
import Pagination     from "../_components/Pagination";
import FilterSelect   from "../_components/FilterSelect";
import { safeInt, safeStr } from "../_lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminItemsPage({ searchParams }: Props) {
  const sp = await searchParams;

  const params = {
    page:        safeInt(safeStr(sp.page), 1),
    pageSize:    20,
    search:      safeStr(sp.search),
    sortBy:      safeStr(sp.sortBy)    || "createdAt",
    sortOrder:   (safeStr(sp.sortOrder) || "desc") as "asc" | "desc",
    status:      safeStr(sp.status),
    listingType: safeStr(sp.listingType),
  };

  const result = await getItems(params);

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-[#111]">สินค้า</h1>
        <p className="text-sm text-[#777] mt-0.5">จัดการรายการสินค้าทั้งหมด</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-64">
          <Suspense fallback={null}>
            <SearchInput placeholder="ค้นหาชื่อสินค้า / ผู้ขาย..." />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <FilterSelect
            name="status"
            options={[
              { value: "",            label: "ทุกสถานะ"     },
              { value: "PENDING",     label: "รออนุมัติ"    },
              { value: "APPROVED",    label: "อนุมัติแล้ว"  },
              { value: "ACTIVE",      label: "กำลังขาย"    },
              { value: "SOLD",        label: "ขายแล้ว"     },
              { value: "RENTED",      label: "ให้เช่าแล้ว" },
              { value: "REJECTED",    label: "ถูกปฏิเสธ"   },
              { value: "REMOVED",     label: "ถูกลบ"       },
              { value: "EXPIRED",     label: "หมดอายุ"     },
            ]}
          />
        </Suspense>
        <Suspense fallback={null}>
          <FilterSelect
            name="listingType"
            options={[
              { value: "",     label: "ทุกประเภท" },
              { value: "SELL", label: "ขาย"       },
              { value: "RENT", label: "เช่า"      },
            ]}
          />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden">
        <ItemsTable rows={result.data} />
      </div>

      {/* Pagination */}
      <Suspense fallback={null}>
        <Pagination meta={result.meta} />
      </Suspense>
    </div>
  );
}

