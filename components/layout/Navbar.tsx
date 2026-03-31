"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import { useWishlistStore } from "@/lib/stores/wishlist-store";
import { useModalStore } from "@/lib/stores/modal-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { type CategorySlug } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { getUnreadCounts } from "@/lib/actions/notification-actions";
import UserDropdown from "./UserDropdown";
import NotificationDropdown from "./NotificationDropdown";
import ChatDropdown from "./ChatDropdown";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCat: CategorySlug;
  onCatChange: (cat: CategorySlug) => void;
  onChatOpen?: (itemId: string, sellerId: string, title: string, emoji: string | null, price: number) => void;
}

const categories: { key: CategorySlug; i18nKey: string }[] = [
  { key: "all", i18nKey: "cat_all" },
  { key: "secondhand", i18nKey: "cat_secondhand" },
  { key: "rental", i18nKey: "cat_rental" },
  { key: "electronics", i18nKey: "cat_electronics" },
  { key: "vehicles", i18nKey: "cat_vehicles" },
  { key: "boardgames", i18nKey: "cat_boardgames" },
  { key: "books", i18nKey: "cat_books" },
];

export default function Navbar({ searchQuery, onSearchChange, activeCat, onCatChange, onChatOpen }: NavbarProps) {
  const { t, locale, toggleLocale } = useLocaleStore();
  const wishlistCount = useWishlistStore((s) => s.count);
  const openModal = useModalStore((s) => s.open);
  const { user, isAuthenticated } = useAuthStore();

  // Dropdown state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Unread counts
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Poll for unread counts when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchCounts() {
      const counts = await getUnreadCounts();
      setUnreadMessages(counts.messages);
      setUnreadNotifications(counts.notifications);
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // every 15s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Close all dropdowns
  const closeDropdowns = useCallback(() => {
    setShowUserMenu(false);
    setShowNotifications(false);
  }, []);

  // ⌘K search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("searchInput")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#f7f6f3]/90 backdrop-blur-md border-b border-[#e5e3de]">
      <div className="max-w-7xl mx-auto px-5 py-4 flex items-center gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <span className="text-xl font-extrabold tracking-tighter">
            PSU<span style={{ color: "var(--accent)" }}>.</span>STORE
          </span>
        </div>

        {/* Search */}
        <div className="search-bar flex-1 max-w-xl bg-white border border-[#e5e3de] rounded-xl px-4 py-2.5 flex items-center gap-2.5 transition-all mx-auto">
          <svg className="w-4 h-4 flex-shrink-0 text-[#9a9590]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="searchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("search_placeholder")}
            className="bg-transparent text-sm w-full focus:outline-none placeholder-[#b0ada6]"
          />
          <kbd className="font-mono hidden md:inline text-[10px] bg-[#f0ede7] text-[#9a9590] px-1.5 py-0.5 rounded border border-[#e5e3de]">
            ⌘K
          </kbd>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Language Toggle */}
          <button
            onClick={toggleLocale}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold tracking-widest transition mr-1"
          >
            <span className={locale === "th" ? "text-[#111] font-bold" : "text-[#9a9590]"}>TH</span>
            <span className="text-[#ccc]">/</span>
            <span className={locale === "en" ? "text-[#111] font-bold" : "text-[#9a9590]"}>EN</span>
          </button>

          {isAuthenticated && user ? (
            <>
              {/* ── Admin Panel Link ── */}
              {user.role === "ADMIN" && (
                <a
                  href="/admin/approvals"
                  className="hidden sm:flex items-center gap-1.5 bg-[#e8500a]/10 text-[#e8500a] text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#e8500a]/20 transition border border-[#e8500a]/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Admin
                </a>
              )}

              {/* ── Chat Icon ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowChat(!showChat);
                    setShowNotifications(false);
                    setShowUserMenu(false);
                  }}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center transition ${
                    showChat ? "bg-[#e8500a]/10 ring-2 ring-[#e8500a]/20" : "bg-[#e5e3de]/60 hover:bg-[#e5e3de]"
                  }`}
                  title="แชท"
                >
                  <svg className="w-5 h-5 text-[#111]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#e8500a] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </button>
                {showChat && (
                  <ChatDropdown
                    onClose={() => setShowChat(false)}
                    onOpenChat={onChatOpen}
                  />
                )}
              </div>

              {/* ── Notification Bell ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                    setShowChat(false);
                  }}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center transition ${
                    showNotifications ? "bg-[#e8500a]/10 ring-2 ring-[#e8500a]/20" : "bg-[#e5e3de]/60 hover:bg-[#e5e3de]"
                  }`}
                  title="การแจ้งเตือน"
                >
                  <svg className="w-5 h-5 text-[#111]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#e8500a] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationDropdown onClose={() => setShowNotifications(false)} />
                )}
              </div>

              {/* ── User Avatar ── */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                    setShowChat(false);
                  }}
                  className={`relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition ring-2 ${
                    showUserMenu ? "ring-[#e8500a]" : "ring-transparent hover:ring-[#e5e3de]"
                  }`}
                  title={user.name || "โปรไฟล์"}
                >
                  {user.image ? (
                    <img src={user.image} alt={user.name || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d] flex items-center justify-center text-white text-sm font-bold">
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22c55e] border-2 border-[#f7f6f3] rounded-full" />
                </button>
                {showUserMenu && (
                  <UserDropdown onClose={() => setShowUserMenu(false)} />
                )}
              </div>
            </>
          ) : (
            <>
              {/* Wishlist (unauthenticated) */}
              <button
                onClick={() => openModal("wishlist")}
                className="relative w-9 h-9 bg-white border border-[#e5e3de] rounded-xl flex items-center justify-center hover:bg-[#f0ede7] transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {wishlistCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#e8500a] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount()}
                  </span>
                )}
              </button>

              {/* Login Button */}
              <button
                onClick={() => openModal("login")}
                className="hidden sm:flex items-center gap-2 bg-[#111] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#333] transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t("login")}</span>
              </button>

              {/* Mobile login */}
              <button
                onClick={() => openModal("login")}
                className="sm:hidden w-9 h-9 bg-[#111] rounded-xl flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category pills row */}
      <div className="max-w-7xl mx-auto px-5 pb-3 flex items-center justify-between gap-4">
        <nav className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <span
              key={cat.key}
              className={`cat-pill ${activeCat === cat.key ? "active" : ""}`}
              onClick={() => onCatChange(cat.key)}
            >
              {t(cat.i18nKey as any)}
            </span>
          ))}
        </nav>
        {/* Admins moderate — they don't post items */}
        {user?.role !== "ADMIN" && (
          <button
            onClick={() => openModal("postAd")}
            className="flex-shrink-0 flex items-center gap-2 bg-[#e8500a] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#c94208] transition shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("sell_rent_btn")}</span>
          </button>
        )}
      </div>
    </header>
  );
}
