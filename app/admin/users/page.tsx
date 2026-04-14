import { Suspense }    from "react";
import { getUsers }    from "./actions";
import UsersTable      from "./_components/UsersTable";
import SearchInput     from "../_components/SearchInput";
import Pagination      from "../_components/Pagination";
import FilterSelect    from "../_components/FilterSelect";
import { safeInt, safeStr } from "../_lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams;

  const params = {
    page:      safeInt(safeStr(sp.page), 1),
    pageSize:  20,
    search:    safeStr(sp.search),
    sortBy:    safeStr(sp.sortBy) || "createdAt",
    sortOrder: (safeStr(sp.sortOrder) || "desc") as "asc" | "desc",
    role:      safeStr(sp.role),
    banned:    safeStr(sp.banned),
  };

  const result = await getUsers(params);

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#111]">ผู้ใช้งาน</h1>
          <p className="text-sm text-[#777] mt-0.5">
            จัดการบัญชีผู้ใช้ บทบาท และการแบน
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-64">
          <Suspense fallback={null}>
            <SearchInput placeholder="ค้นหาชื่อ / อีเมล..." />
          </Suspense>
        </div>

        {/* Role filter */}
        <Suspense fallback={null}>
          <FilterSelect
            name="role"
            options={[
              { value: "",        label: "ทุกบทบาท" },
              { value: "ADMIN",   label: "แอดมิน"   },
              { value: "STUDENT", label: "นักศึกษา" },
            ]}
          />
        </Suspense>

        {/* Banned filter */}
        <Suspense fallback={null}>
          <FilterSelect
            name="banned"
            options={[
              { value: "",      label: "ทุกสถานะ" },
              { value: "false", label: "ปกติ"      },
              { value: "true",  label: "ถูกแบน"   },
            ]}
          />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden">
        <UsersTable rows={result.data} />
      </div>

      {/* Pagination */}
      <Suspense fallback={null}>
        <Pagination meta={result.meta} />
      </Suspense>
    </div>
  );
}

