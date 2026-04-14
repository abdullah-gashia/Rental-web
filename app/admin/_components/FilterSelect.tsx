"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  name:    string;
  options: Option[];
}

export default function FilterSelect({ name, options }: FilterSelectProps) {
  const router   = useRouter();
  const sp       = useSearchParams();
  const pathname = usePathname();
  const current  = sp.get(name) ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(sp.toString());
    value ? params.set(name, value) : params.delete(name);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="text-sm border border-[#e5e3de] rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/20 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
