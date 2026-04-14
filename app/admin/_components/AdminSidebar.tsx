"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

interface NavItem {
  href:   string;
  emoji:  string;
  label:  string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", emoji: "📊", label: "แดชบอร์ด"        },
  { href: "/admin/users",     emoji: "👤", label: "ผู้ใช้งาน"        },
  { href: "/admin/items",     emoji: "📦", label: "สินค้า"           },
  { href: "/admin/orders",    emoji: "💰", label: "รายการสั่งซื้อ"   },
  { href: "/admin/disputes",  emoji: "🚨", label: "ข้อพิพาท"         },
  { href: "/admin/approvals", emoji: "✅", label: "ตรวจสอบสินค้า"   },
];

interface AdminSidebarProps {
  adminName: string | null;
  adminEmail: string;
}

export default function AdminSidebar({ adminName, adminEmail }: AdminSidebarProps) {
  const pathname   = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navList = (
    <nav className="flex flex-col gap-0.5">
      <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest mb-2 px-3">เมนู</p>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-[#e8500a]/10 text-[#e8500a] font-semibold"
              : "text-[#555] hover:bg-[#f0ede7]"
          }`}
        >
          <span className="text-base">{item.emoji}</span>
          {item.label}
        </a>
      ))}
    </nav>
  );

  const adminFooter = (
    <div className="mt-auto pt-4 border-t border-[#e5e3de]">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {(adminName ?? adminEmail)[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#111] truncate">{adminName ?? "Admin"}</p>
          <p className="text-[10px] text-[#9a9590] truncate">{adminEmail}</p>
        </div>
      </div>
      <a
        href="/"
        className="flex items-center gap-2 px-3 py-2 text-xs text-[#777] hover:text-[#333] transition mt-1"
      >
        ← กลับหน้าหลัก
      </a>
    </div>
  );

  return (
    <>
      {/* ── Mobile hamburger button ───────────────────────── */}
      <button
        className="md:hidden fixed top-3.5 left-5 z-[60] w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#e5e3de] shadow-sm"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* ── Mobile overlay ────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[55]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ────────────────────────── */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-[#e5e3de] z-[56] flex flex-col p-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 mt-10">
          <span className="text-lg font-extrabold tracking-tighter">
            PSU<span className="text-[#e8500a]">.</span>STORE
          </span>
          <span className="ml-2 text-xs font-semibold text-[#e8500a] bg-[#e8500a]/10 px-2 py-0.5 rounded-lg">
            Admin
          </span>
        </div>
        {navList}
        {adminFooter}
      </div>

      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0 gap-1">
        {navList}
        {adminFooter}
      </aside>
    </>
  );
}
