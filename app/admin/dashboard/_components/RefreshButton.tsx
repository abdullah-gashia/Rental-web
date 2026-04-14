"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="flex items-center gap-2 text-sm font-medium text-[#555] border border-[#e5e3de] bg-white hover:bg-[#f7f6f3] px-4 py-2 rounded-xl transition disabled:opacity-50"
      aria-label="รีเฟรชข้อมูล"
    >
      <svg
        className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {isPending ? "กำลังโหลด…" : "รีเฟรช"}
    </button>
  );
}
