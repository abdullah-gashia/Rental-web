"use client";

import { useModalStore } from "@/lib/stores/modal-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWishlistStore } from "@/lib/stores/wishlist-store";
import { useLocaleStore } from "@/lib/stores/locale-store";
import type { CategorySlug, RailSelection } from "@/lib/types";

interface SideRailProps {
  activeCat: RailSelection;
  onCatChange: (cat: CategorySlug) => void;
}

const icon = (d: string) => (
  <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={d} />
  </svg>
);

const PATHS = {
  home:        "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10",
  tag:         "M7 7h.01M3 5.6V10a2 2 0 00.59 1.42l8 8a2 2 0 002.82 0l5.6-5.6a2 2 0 000-2.82l-8-8A2 2 0 0010.6 2H6a3 3 0 00-3 3z",
  rent:        "M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  electronics: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 7h10v10H7z",
  vehicles:    "M5 17a2 2 0 104 0m6 0a2 2 0 104 0M3 13l1.6-5.2A2 2 0 016.5 6.4h11a2 2 0 011.9 1.4L21 13v4h-2m-10 0H5v-4h16",
  boardgames:  "M4 4h16v16H4zM8.5 8.5h.01M15.5 8.5h.01M8.5 15.5h.01M15.5 15.5h.01M12 12h.01",
  books:       "M4 5a2 2 0 012-2h11a1 1 0 011 1v14a1 1 0 01-1 1H6a2 2 0 00-2 2V5zM6 17h12",
  heart:       "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  plus:        "M12 5v14m7-7H5",
  box:         "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  people:      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
};

export default function SideRail({ activeCat, onCatChange }: SideRailProps) {
  const t             = useLocaleStore((s) => s.t);
  const openModal     = useModalStore((s) => s.open);
  const user          = useAuthStore((s) => s.user);
  const wishlistCount = useWishlistStore((s) => s.count);

  const navItems: { key: CategorySlug; label: string; path: string }[] = [
    { key: "all",         label: "หน้าแรก",        path: PATHS.home },
    { key: "secondhand",  label: t("cat_secondhand"),  path: PATHS.tag },
    { key: "rental",      label: t("cat_rental"),      path: PATHS.rent },
    { key: "electronics", label: t("cat_electronics"), path: PATHS.electronics },
    { key: "vehicles",    label: t("cat_vehicles"),    path: PATHS.vehicles },
    { key: "boardgames",  label: t("cat_boardgames"),  path: PATHS.boardgames },
    { key: "books",       label: t("cat_books"),       path: PATHS.books },
  ];

  return (
    <aside className="hp-rail" aria-label="หมวดหมู่">
      <nav className="flex flex-col items-center gap-1" role="tablist">
        {navItems.map((it) => (
          <button
            key={it.key}
            role="tab"
            aria-selected={activeCat === it.key}
            title={it.label}
            onClick={() => onCatChange(it.key)}
            className={`hp-rail-item ${activeCat === it.key ? "active" : ""}`}
          >
            {icon(it.path)}
            <span>{it.label}</span>
          </button>
        ))}
      </nav>

      {/* Pinned to the bottom, like the Store's Library group */}
      <div className="mt-auto pt-3 flex flex-col items-center gap-1">
        <a
          href="/users"
          title="ผู้ใช้งาน"
          className={`hp-rail-item ${activeCat === "users" ? "active" : ""}`}
        >
          {icon(PATHS.people)}
          <span>ผู้ใช้งาน</span>
        </a>

        <button
          title="รายการโปรด"
          onClick={() => openModal("wishlist")}
          className="hp-rail-item"
        >
          <span className="relative">
            {icon(PATHS.heart)}
            {wishlistCount() > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-[var(--psu-blue)] text-white text-[9px] font-semibold rounded-full flex items-center justify-center px-1">
                {wishlistCount() > 9 ? "9+" : wishlistCount()}
              </span>
            )}
          </span>
          <span>โปรด</span>
        </button>

        {user?.role === "ADMIN" ? (
          <a href="/admin/approvals" title="Admin" className="hp-rail-item">
            {icon(PATHS.box)}
            <span>Admin</span>
          </a>
        ) : (
          <button
            title={t("sell_rent_btn")}
            onClick={() => openModal("postAd")}
            className="hp-rail-item"
          >
            {icon(PATHS.plus)}
            <span>{t("sell_rent_btn")}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
