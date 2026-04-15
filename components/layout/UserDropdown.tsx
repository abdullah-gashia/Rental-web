"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { logout } from "@/lib/actions/auth-actions";

interface UserDropdownProps {
  onClose: () => void;
}

export default function UserDropdown({ onClose }: UserDropdownProps) {
  const { user, logout: clearAuth } = useAuthStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleLogout = async () => {
    await logout();
    clearAuth();
    onClose();
  };

  if (!user) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-[320px] bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.16)] border border-[#e5e3de]/60 overflow-hidden z-[200] fade-up"
    >
      {/* User Header */}
      <div className="p-4 border-b border-[#e5e3de]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f7f6f3] transition cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-[#e8500a] to-[#ff7a3d] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {(user.name || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111]">{user.name || "User"}</p>
            <p className="text-[11px] text-[#9a9590]">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-2">
        {/* My Dashboard — hidden for ADMIN (admins use the Admin Panel link instead) */}
        {user.role !== "ADMIN" && (
          <a
            href="/dashboard/my-items"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f6f3] transition cursor-pointer group"
            onClick={onClose}
          >
            <div className="w-9 h-9 bg-[#f0ede7] rounded-full flex items-center justify-center group-hover:bg-[#e5e3de] transition">
              <svg className="w-[18px] h-[18px] text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#111]">แดชบอร์ดของฉัน</p>
              <p className="text-[11px] text-[#9a9590]">สินค้าและสถานะการอนุมัติ</p>
            </div>
            <svg className="w-4 h-4 text-[#b0ada6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}

        {/* Admin Panel — only for ADMIN role */}
        {user.role === "ADMIN" && (
          <a
            href="/admin/approvals"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 transition cursor-pointer group"
            onClick={onClose}
          >
            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition">
              <svg className="w-[18px] h-[18px] text-[#e8500a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#e8500a]">แผงควบคุมแอดมิน</p>
              <p className="text-[11px] text-[#9a9590]">ตรวจสอบและอนุมัติสินค้า</p>
            </div>
            <svg className="w-4 h-4 text-[#b0ada6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}

        {/* Settings & Privacy — hidden for ADMIN (admins manage settings via Admin Panel) */}
        {user.role !== "ADMIN" && (
          <a
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f6f3] transition cursor-pointer group"
            onClick={onClose}
          >
            <div className="w-9 h-9 bg-[#f0ede7] rounded-full flex items-center justify-center group-hover:bg-[#e5e3de] transition">
              <svg className="w-[18px] h-[18px] text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-medium text-[#111]">การตั้งค่าและความเป็นส่วนตัว</p>
            </div>
            <svg className="w-4 h-4 text-[#b0ada6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}

        {/* Help & Support */}
        <a
          href="/support"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f7f6f3] transition cursor-pointer group"
          onClick={onClose}
        >
          <div className="w-9 h-9 bg-[#f0ede7] rounded-full flex items-center justify-center group-hover:bg-[#e5e3de] transition">
            <svg className="w-[18px] h-[18px] text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-medium text-[#111]">ความช่วยเหลือและการสนับสนุน</p>
          </div>
          <svg className="w-4 h-4 text-[#b0ada6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>

        {/* Divider */}
        <div className="my-1.5 border-t border-[#e5e3de]" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition cursor-pointer group"
        >
          <div className="w-9 h-9 bg-[#f0ede7] rounded-full flex items-center justify-center group-hover:bg-red-100 transition">
            <svg className="w-[18px] h-[18px] text-[#333] group-hover:text-red-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-[#111] group-hover:text-red-600 transition">ออกจากระบบ</p>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#e5e3de] bg-[#fafaf8]">
        <p className="text-[10px] text-[#b0ada6] text-center">
          PSU Store © 2026 · <a href="#" className="hover:underline">ข้อกำหนด</a> · <a href="#" className="hover:underline">นโยบาย</a>
        </p>
      </div>
    </div>
  );
}
