"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface SearchInputProps {
  placeholder?: string;
  paramKey?: string;   // URL param name, default "search"
}

export default function SearchInput({
  placeholder = "ค้นหา...",
  paramKey    = "search",
}: SearchInputProps) {
  const router   = useRouter();
  const sp       = useSearchParams();
  const pathname = usePathname();
  const didMount = useRef(false);
  const [value, setValue] = useState(sp.get(paramKey) ?? "");

  // Debounce 300 ms — skip initial mount
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      value.trim() ? params.set(paramKey, value.trim()) : params.delete(paramKey);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9590]"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#e5e3de] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 focus:border-[#e8500a] transition"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9590] hover:text-[#333] transition"
          aria-label="ล้างการค้นหา"
        >
          ×
        </button>
      )}
    </div>
  );
}
