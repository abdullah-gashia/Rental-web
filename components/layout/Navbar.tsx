"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import Brand from "@/components/layout/Brand";
import { useWishlistStore } from "@/lib/stores/wishlist-store";
import { useModalStore } from "@/lib/stores/modal-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { type CategorySlug, type RailSelection } from "@/lib/types";
import { useEffect, useState } from "react";
import { getUnreadCounts } from "@/lib/actions/notification-actions";
import UserDropdown from "./UserDropdown";
import NotificationDropdown from "./NotificationDropdown";
import ChatDropdown from "./ChatDropdown";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCat: RailSelection;
  onCatChange: (cat: CategorySlug) => void;
  onChatOpen?: (itemId: string, sellerId: string, title: string, emoji: string | null, price: number) => void;
  /** Overrides the search hint — the people directory searches people, not listings */
  searchPlaceholder?: string;
  /** Hides the category tab strip on pages that are not the marketplace */
  hideCategories?: boolean;
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

/** Square icon button — the only button shape in the top bar. */
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
      className={`relative w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
        active
          ? "bg-[var(--psu-sky)] text-[var(--psu-indigo)]"
          : "text-[var(--hp-ink-2)] hover:bg-[rgba(10,43,94,0.06)]"
      }`}
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-[var(--psu-blue)] text-white text-[9px] font-semibold rounded-full flex items-center justify-center px-1 ring-2 ring-[var(--hp-canvas)]">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default function Navbar({
  searchQuery, onSearchChange, activeCat, onCatChange, onChatOpen,
  searchPlaceholder, hideCategories = false,
}: NavbarProps) {
  const tr = useLocaleStore((s) => s.tr);
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
    <>
      <header className="hp-topbar">
        <div className="w-full px-3 flex items-center gap-3">
          {/* Wordmark */}
          <div className="flex-shrink-0 pl-1">
            <Brand size={24} />
          </div>

          {/* Search — centred in the window, like the Store's */}
          <div className="flex-1 flex justify-center min-w-0">
            <div className="search-bar w-full max-w-[560px] bg-[var(--c-surface)] border border-[var(--hp-border)] rounded-md h-8 px-2.5 flex items-center gap-2">
              <input
                id="searchInput"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? t("search_placeholder")}
                className="bg-transparent text-[13px] w-full focus:outline-none text-[var(--hp-ink)] placeholder-[var(--c-muted)]"
              />
              <kbd className="hp-num hidden md:inline text-[9.5px] text-[var(--hp-muted)] bg-[var(--hp-subtle)] px-1.5 py-0.5 rounded border border-[var(--hp-border)]">
                ⌘K
              </kbd>
              <svg className="w-4 h-4 flex-shrink-0 text-[var(--hp-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleLocale}
              className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2 h-8 rounded-md hover:bg-[rgba(10,43,94,0.06)] transition-colors"
              title="Language"
            >
              <span className={locale === "th" ? "text-[var(--psu-navy)]" : "text-[var(--hp-muted)]"}>TH</span>
              <span className="text-[var(--hp-border-str)]">/</span>
              <span className={locale === "en" ? "text-[var(--psu-navy)]" : "text-[var(--hp-muted)]"}>EN</span>
            </button>

            {isAuthenticated && user ? (
              <>
                {/* Chat */}
                <div className="relative">
                  <IconButton
                    title={tr("แชท")}
                    active={showChat}
                    badge={unreadMessages}
                    onClick={() => {
                      setShowChat(!showChat);
                      setShowNotifications(false);
                      setShowUserMenu(false);
                    }}
                  >
                    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </IconButton>
                  {showChat && (
                    <ChatDropdown onClose={() => setShowChat(false)} onOpenChat={onChatOpen} />
                  )}
                </div>

                {/* Notifications */}
                <div className="relative">
                  <IconButton
                    title={tr("การแจ้งเตือน")}
                    active={showNotifications}
                    badge={unreadNotifications}
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowUserMenu(false);
                      setShowChat(false);
                    }}
                  >
                    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center ring-2 transition ${
                      showUserMenu ? "ring-[var(--psu-navy)]" : "ring-transparent hover:ring-[var(--hp-border-str)]"
                    }`}
                    title={user.name || tr("โปรไฟล์")}
                  >
                    {user.image ? (
                      <img src={user.image} alt={user.name || ""} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[var(--psu-navy)] flex items-center justify-center text-white text-[11px] font-semibold">
                        {(user.name || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </button>
                  {showUserMenu && <UserDropdown onClose={() => setShowUserMenu(false)} />}
                </div>
              </>
            ) : (
              <>
                {/* Wishlist lives in the rail on desktop — keep it reachable on mobile */}
                <div className="md:hidden">
                  <IconButton
                    title={tr("รายการโปรด")}
                    badge={wishlistCount()}
                    onClick={() => openModal("wishlist")}
                  >
                    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </IconButton>
                </div>

                <button onClick={() => openModal("login")} className="hp-btn hp-btn-primary h-8">
                  {t("login")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile category strip — the rail is desktop-only */}
      {!hideCategories && (
      <div className="md:hidden sticky top-12 z-40 bg-[var(--hp-canvas)] px-4 pb-1">
        <nav className="flex gap-5 overflow-x-auto no-scrollbar border-b border-[var(--hp-border)]" role="tablist">
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
      </div>
      )}
    </>
  );
}
