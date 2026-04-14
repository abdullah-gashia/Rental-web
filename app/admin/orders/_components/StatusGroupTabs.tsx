"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { key: "all",       label: "ทั้งหมด"          },
  { key: "pending",   label: "รอยืนยัน"          },
  { key: "active",    label: "กำลังดำเนินการ"    },
  { key: "completed", label: "สำเร็จ"            },
  { key: "problem",   label: "มีปัญหา"           },
] as const;

export default function StatusGroupTabs({ active }: { active: string }) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  function handleClick(key: string) {
    const params = new URLSearchParams(sp.toString());
    if (key === "all") {
      params.delete("statusGroup");
    } else {
      params.set("statusGroup", key);
    }
    // Clear the granular status filter and reset page when switching groups
    params.delete("status");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const isActive = active === tab.key || (tab.key === "all" && active === "");
        return (
          <button
            key={tab.key}
            onClick={() => handleClick(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap border ${
              isActive
                ? "bg-[#111] text-white border-[#111]"
                : "bg-white text-[#555] border-[#e5e3de] hover:border-[#111] hover:text-[#111]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
