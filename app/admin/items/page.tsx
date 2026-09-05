import { getTr } from "@/lib/i18n/server";
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
  const tr = await getTr();
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
        <h1 className="text-xl font-bold text-[var(--c-ink)]">{tr("สินค้า")}</h1>
        <p className="text-sm text-[var(--c-ink-3)] mt-0.5">{tr("จัดการรายการสินค้าทั้งหมด")}</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-64">
          <Suspense fallback={null}>
            <SearchInput placeholder={tr("ค้นหาชื่อสินค้า / ผู้ขาย...")} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <FilterSelect
            name="status"
            options={[
              { value: "",            label: tr("ทุกสถานะ")     },
              { value: "PENDING",     label: tr("รออนุมัติ")    },
              { value: "APPROVED",    label: tr("อนุมัติแล้ว")  },
              { value: "ACTIVE",      label: tr("กำลังขาย")    },
              { value: "SOLD",        label: tr("ขายแล้ว")     },
              { value: "RENTED",      label: tr("ให้เช่าแล้ว") },
              { value: "REJECTED",    label: tr("ถูกปฏิเสธ")   },
              { value: "REMOVED",     label: tr("ถูกลบ")       },
              { value: "EXPIRED",     label: tr("หมดอายุ")     },
            ]}
          />
        </Suspense>
        <Suspense fallback={null}>
          <FilterSelect
            name="listingType"
            options={[
              { value: "",     label: tr("ทุกประเภท") },
              { value: "SELL", label: tr("ขาย")       },
              { value: "RENT", label: tr("เช่า")      },
            ]}
          />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] overflow-hidden">
        <ItemsTable rows={result.data} />
      </div>

      {/* Pagination */}
      <Suspense fallback={null}>
        <Pagination meta={result.meta} />
      </Suspense>
    </div>
  );
}

