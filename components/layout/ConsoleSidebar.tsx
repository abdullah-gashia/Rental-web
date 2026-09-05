"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The sidebar behind every signed-in console — the admin panel, the seller hub
 * and the งานภัทร office all render this one component.
 *
 * They used to have three different navigations: the admin panel had emoji in a
 * flat list of nine, the seller dashboard had four plain-text links in a top
 * bar with no sense of place, and the office had a third thing again. Grouping
 * the items and drawing them the same way in all three is most of what makes
 * the product feel like one product.
 */

export interface NavEntry {
  href:   string;
  label:  string;
  icon:   keyof typeof ICONS;
  badge?: number;
  /** Draw the badge in red — something is wrong, not merely waiting. */
  danger?: boolean;
  /** Match only this exact path (for a section index like /dashboard). */
  exact?: boolean;
}

export interface NavGroup {
  title?: string;
  items:  NavEntry[];
}

/** Stroke paths, sized for a 24-box. Line icons read at 17px; emoji do not. */
const ICONS = {
  home:      "M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1v-9",
  box:       "M20 7.5 12 3.5 4 7.5m16 0-8 4m8-4V16l-8 4m0-8.5L4 7.5m8 4V20M4 7.5V16l8 4",
  tag:       "M7 7h.01M3.5 5.8V10a2 2 0 0 0 .6 1.4l8 8a2 2 0 0 0 2.8 0l5.6-5.6a2 2 0 0 0 0-2.8l-8-8A2 2 0 0 0 10.6 2.5H6a2.5 2.5 0 0 0-2.5 2.5z",
  cart:      "M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 8H6M9 20.5h.01M17 20.5h.01",
  wallet:    "M3 8.5A2.5 2.5 0 0 1 5.5 6H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 15.5zM3 8.5V7a2 2 0 0 1 2-2h11M17 12.5h.01",
  key:       "M14.5 9.5a3.5 3.5 0 1 1-4.9 3.2L4 18.3V21h3v-2h2v-2h2l1.7-1.7a3.5 3.5 0 0 0 1.8.2M15.5 8.5h.01",
  hands:     "M7 11V7a2 2 0 1 1 4 0v4m0 0V5.5a2 2 0 1 1 4 0V11m0 0V8.5a2 2 0 1 1 4 0V15a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-3.5a2 2 0 1 1 4 0V13",
  users:     "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M13 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3 3 0 0 1 0 5.8",
  chart:     "M4 20V10M10 20V4M16 20v-7M22 20H2",
  shield:    "M12 3 5 6v5.5c0 4.3 2.9 8.3 7 9.5 4.1-1.2 7-5.2 7-9.5V6z M9.5 12l1.8 1.8L15 10",
  check:     "M4 12.5 9 17.5 20 6.5",
  flame:     "M12 3s4.5 3.5 4.5 8a4.5 4.5 0 0 1-9 0c0-1.4.6-2.6 1.3-3.5M12 21a5 5 0 0 0 5-5",
  alert:     "M12 9v4.5M12 17h.01M10.3 4.3 2.6 17.7A1.5 1.5 0 0 0 3.9 20h16.2a1.5 1.5 0 0 0 1.3-2.3L13.7 4.3a2 2 0 0 0-3.4 0z",
  mail:      "M3.5 7.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5zM3.5 7.5 12 13.5l8.5-6",
  search:    "M21 21l-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z",
  gear:      "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1z",
  star:      "M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z",
  clock:     "M12 7.5V12l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="ui-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

interface Props {
  /** Shown above the nav, e.g. "แผงผู้ดูแล" */
  title:   string;
  groups:  NavGroup[];
  user:    { name: string | null; email: string; role?: string };
  /** Where the "back to the site" link goes. */
  backHref?:  string;
  backLabel?: string;
  /** Fallback name shown when the account has none. */
  userFallback?: string;
}

export default function ConsoleSidebar({
  title, groups, user, backHref = "/", backLabel = "กลับหน้าร้าน", userFallback = "ผู้ใช้",
}: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isOn = (e: NavEntry) =>
    e.exact ? pathname === e.href : pathname === e.href || pathname.startsWith(e.href + "/");

  const nav = (
    <nav className="ui-nav" aria-label={title}>
      {groups.map((g, gi) => (
        <div key={g.title ?? gi}>
          {g.title && <p className="ui-nav-group">{g.title}</p>}
          {g.items.map((e) => (
            <a
              key={e.href}
              href={e.href}
              onClick={() => setOpen(false)}
              aria-current={isOn(e) ? "page" : undefined}
              className={`ui-nav-item ${isOn(e) ? "is-on" : ""}`}
            >
              <Icon name={e.icon} />
              <span className="flex-1 truncate">{tr(e.label)}</span>
              {!!e.badge && e.badge > 0 && (
                <span className={`ui-nav-badge ${e.danger ? "is-bad" : ""}`}>
                  {e.badge > 99 ? "99+" : e.badge}
                </span>
              )}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto pt-4 border-t border-[var(--hp-border)]">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-[var(--psu-navy)] text-white text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
          {(user.name ?? user.email ?? "U")[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[var(--hp-ink)] truncate">
            {user.name ?? userFallback}
          </p>
          <p className="text-[10.5px] text-[var(--hp-muted)] truncate">{user.email}</p>
        </div>
      </div>
      <a href={backHref} className="ui-nav-item !text-[12.5px] !py-2">
        <svg className="ui-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 19l-7-7 7-7M3 12h18" />
        </svg>
        {backLabel}
      </a>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        className="md:hidden fixed top-3 left-4 z-[60] w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--c-surface)] border border-[var(--hp-border-str)]"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? backLabel : title}
        aria-expanded={open}
      >
        <svg className="w-5 h-5 text-[var(--hp-ink)]" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" viewBox="0 0 24 24" aria-hidden>
          <path d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 bg-[rgba(10,25,47,.45)] z-[55]" onClick={() => setOpen(false)} />
      )}

      <div
        className={`md:hidden fixed top-0 left-0 h-full w-[248px] bg-[var(--c-surface)] border-r border-[var(--hp-border)] z-[56] flex flex-col p-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="ui-eyebrow mt-11 mb-4 px-3">{title}</p>
        {nav}
        {footer}
      </div>

      <aside className="hidden md:flex flex-col w-[204px] flex-shrink-0">
        <p className="ui-eyebrow mb-3 px-3">{title}</p>
        {nav}
        {footer}
      </aside>
    </>
  );
}
