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

/** Small square icon button — the only button shape in the top bar. */
function IconButton({
  active,
  title,
  onClick,
  badge,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`relative w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
        active
          ? "bg-[var(--psu-sky)] border-[var(--psu-sky-200)] text-[var(--psu-indigo)]"
          : "bg-white border-transparent text-[var(--hp-ink-2)] hover:bg-[var(--hp-subtle)] hover:border-[var(--hp-border)]"
      }`}
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-[var(--psu-blue)] text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

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
    <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-md border-b border-[var(--hp-border)]">
      {/* ── Row 1 — identity · search · account ───────────────────── */}
      <div className="max-w-[1240px] mx-auto px-5 h-14 flex items-center gap-4">
        {/* Wordmark */}
        <a href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <span className="w-7 h-7 rounded-md bg-[var(--psu-navy)] text-white flex items-center justify-center text-[11px] font-bold tracking-tight">
            ม.อ.
          </span>
          <span className="hidden sm:block text-[15px] font-semibold tracking-tight text-[var(--psu-navy)]">
            PSU Store
          </span>
        </a>

        <span className="hidden sm:block w-px h-5 bg-[var(--hp-border)]" />

        {/* Search */}
        <div className="search-bar flex-1 max-w-md bg-white border border-[var(--hp-border)] rounded-md h-9 px-3 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--hp-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="searchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("search_placeholder")}
            className="bg-transparent text-[13px] w-full focus:outline-none text-[var(--hp-ink)] placeholder-[#64748b]"
          />
          <kbd className="hp-num hidden md:inline text-[10px] text-[var(--hp-muted)] bg-[var(--hp-subtle)] px-1.5 py-0.5 rounded border border-[var(--hp-border)]">
            ⌘K
          </kbd>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            className="hidden sm:flex items-center gap-1 text-[11px] font-semibold tracking-wide mr-1 px-2 h-8 rounded-md hover:bg-[var(--hp-subtle)] transition-colors"
            title="Language"
          >
            <span className={locale === "th" ? "text-[var(--psu-navy)]" : "text-[var(--hp-muted)]"}>TH</span>
            <span className="text-[var(--hp-border-str)]">/</span>
            <span className={locale === "en" ? "text-[var(--psu-navy)]" : "text-[var(--hp-muted)]"}>EN</span>
          </button>

          {isAuthenticated && user ? (
            <>
              {/* Admin panel */}
              {user.role === "ADMIN" && (
                <a
                  href="/admin/approvals"
                  className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-semibold text-[var(--psu-indigo)] bg-[var(--psu-sky)] border border-[var(--psu-sky-200)] hover:bg-[#e2ecff] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Admin
                </a>
              )}

              {/* Chat */}
              <div className="relative">
                <IconButton
                  title="แชท"
                  active={showChat}
                  badge={unreadMessages}
                  onClick={() => {
                    setShowChat(!showChat);
                    setShowNotifications(false);
                    setShowUserMenu(false);
                  }}
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </IconButton>
                {showChat && (
                  <ChatDropdown
                    onClose={() => setShowChat(false)}
                    onOpenChat={onChatOpen}
                  />
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <IconButton
                  title="การแจ้งเตือน"
                  active={showNotifications}
                  badge={unreadNotifications}
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                    setShowChat(false);
                  }}
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1h6z" />
                  </svg>
                </IconButton>
                {showNotifications && (
                  <NotificationDropdown onClose={() => setShowNotifications(false)} />
                )}
              </div>

              {/* Avatar */}
              <div className="relative ml-0.5">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                    setShowChat(false);
                  }}
                  className={`relative w-9 h-9 rounded-md overflow-hidden flex items-center justify-center border transition-colors ${
                    showUserMenu ? "border-[var(--psu-navy)]" : "border-[var(--hp-border)] hover:border-[var(--hp-border-str)]"
                  }`}
                  title={user.name || "โปรไฟล์"}
                >
                  {user.image ? (
                    <img src={user.image} alt={user.name || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[var(--psu-navy)] flex items-center justify-center text-white text-[13px] font-semibold">
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </button>
                {showUserMenu && (
                  <UserDropdown onClose={() => setShowUserMenu(false)} />
                )}
              </div>
            </>
          ) : (
            <>
              {/* Wishlist (unauthenticated) */}
              <IconButton
                title="รายการโปรด"
                badge={wishlistCount()}
                onClick={() => openModal("wishlist")}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </IconButton>

              <button
                onClick={() => openModal("login")}
                className="hp-btn hp-btn-primary h-9"
              >
                <span>{t("login")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2 — category tabs · primary action ────────────────── */}
      <div className="max-w-[1240px] mx-auto px-5 flex items-end justify-between gap-4">
        <nav className="flex gap-6 overflow-x-auto no-scrollbar -mb-px" role="tablist">
          {categories.map((cat) => (
            <span
              key={cat.key}
              role="tab"
              aria-selected={activeCat === cat.key}
              className={`cat-pill ${activeCat === cat.key ? "active" : ""}`}
              onClick={() => onCatChange(cat.key)}
            >
              {t(cat.i18nKey as any)}
            </span>
          ))}
        </nav>

        {/* Admins moderate — they don't post items.
            Hidden on mobile: the floating action button covers that case. */}
        {user?.role !== "ADMIN" && (
          <button
            onClick={() => openModal("postAd")}
            className="hp-btn hp-btn-primary flex-shrink-0 mb-2 hidden md:inline-flex"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("sell_rent_btn")}</span>
          </button>
        )}
      </div>
    </header>
  );
}
