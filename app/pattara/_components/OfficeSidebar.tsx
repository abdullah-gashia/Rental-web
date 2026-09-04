"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

interface Props {
  name:  string | null;
  email: string;
  waitingCount: number;
  overdueCount: number;
}

export default function OfficeSidebar({ name, email, waitingCount, overdueCount }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/pattara",          icon: "◧", label: "ภาพรวม" },
    { href: "/pattara/items",    icon: "▣", label: "คลังอุปกรณ์" },
    { href: "/pattara/requests", icon: "◔", label: "คำขอยืม", badge: waitingCount },
    { href: "/pattara/orders",   icon: "◫", label: "รายการยืม", badge: overdueCount, danger: true },
    { href: "/pattara/fund",     icon: "◈", label: "กองทุน" },
  ];

  const active = (href: string) =>
    href === "/pattara" ? pathname === "/pattara" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-0.5">
      <p className="bw-label px-3 mb-2">เมนู</p>
      {items.map((it) => (
        <a
          key={it.href}
          href={it.href}
          onClick={() => setOpen(false)}
          className={`bw-nav-item ${active(it.href) ? "active" : ""}`}
        >
          <span className="text-[15px] leading-none opacity-70">{it.icon}</span>
          <span className="flex-1">{it.label}</span>
          {!!it.badge && it.badge > 0 && (
            <span className={`text-[10px] font-bold rounded-full min-w-[18px] text-center px-1.5 py-0.5 text-white ${
              it.danger ? "bg-[#b3261e]" : "bg-[var(--psu-blue)]"
            }`}>
              {it.badge > 99 ? "99+" : it.badge}
            </span>
          )}
        </a>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto pt-4 border-t border-[var(--bw-line)]">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-[var(--psu-navy)] flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0">
          {(name ?? email ?? "ภ")[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold truncate">{name ?? "เจ้าหน้าที่"}</p>
          <p className="text-[10.5px] text-[var(--bw-muted)] truncate">{email}</p>
        </div>
      </div>
      <a href="/borrow" className="bw-nav-item !text-[12px] !py-2">← หน้าที่นักศึกษาเห็น</a>
    </div>
  );

  return (
    <>
      <button
        className="md:hidden fixed top-3 left-4 z-[60] w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[var(--bw-line-2)]"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {open && <div className="md:hidden fixed inset-0 bg-black/40 z-[55]" onClick={() => setOpen(false)} />}

      <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-[var(--bw-line)] z-[56] flex flex-col p-4 transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="mb-6 mt-11 text-[15px] font-extrabold tracking-tighter text-[var(--psu-navy)]">
          งานภัทร
        </div>
        {nav}
        {footer}
      </div>

      <aside className="hidden md:flex flex-col w-[196px] flex-shrink-0">
        {nav}
        {footer}
      </aside>
    </>
  );
}
