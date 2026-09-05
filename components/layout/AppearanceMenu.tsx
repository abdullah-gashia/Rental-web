"use client";

import { useState, useRef, useEffect } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import { useThemeStore, type ThemeChoice } from "@/lib/stores/theme-store";

/**
 * Language and theme, one control, in every console header.
 *
 * Both settings already existed on /settings, but a visitor who cannot read the
 * page they are on cannot navigate to the settings page to fix that — the
 * switch has to be reachable from wherever they landed.
 */

const THEMES: { key: ThemeChoice; th: string; en: string; icon: string }[] = [
  { key: "light",  th: "สว่าง",    en: "Light",  icon: "M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5-1.4 1.4M7.9 16.1l-1.4 1.4m11.6 0-1.4-1.4M7.9 7.9 6.5 6.5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" },
  { key: "dark",   th: "มืด",      en: "Dark",   icon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" },
  { key: "system", th: "ตามระบบ", en: "System", icon: "M4 5.5h16v10H4zM9 20h6M12 15.5V20" },
];

export default function AppearanceMenu() {
  const locale     = useLocaleStore((s) => s.locale);
  const setLocale  = useLocaleStore((s) => s.setLocale);
  const theme      = useThemeStore((s) => s.theme);
  const setTheme   = useThemeStore((s) => s.setTheme);

  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const th = locale !== "en";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="ui-btn ui-btn-ghost ui-btn-sm !px-2.5"
        aria-label={th ? "ภาษาและธีม" : "Language and theme"}
        aria-expanded={open}
      >
        <span className="font-semibold tracking-wide">{locale.toUpperCase()}</span>
        <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[210px] rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)] shadow-lg p-2 z-[300]">
          <p className="ui-eyebrow px-2 py-1.5">{th ? "ภาษา" : "Language"}</p>
          <div className="grid grid-cols-2 gap-1.5 px-1 pb-2">
            {(["th", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => { setOpen(false); setLocale(l); }}
                aria-pressed={locale === l}
                className={`ui-chip justify-center ${locale === l ? "is-on" : ""}`}
              >
                {l === "th" ? "ไทย" : "English"}
              </button>
            ))}
          </div>

          <div className="border-t border-[var(--c-line)] pt-2">
            <p className="ui-eyebrow px-2 py-1.5">{th ? "ธีม" : "Theme"}</p>
            <div className="flex flex-col gap-0.5">
              {THEMES.map((x) => (
                <button
                  key={x.key}
                  onClick={() => setTheme(x.key)}
                  aria-pressed={theme === x.key}
                  className={`ui-nav-item !text-[13px] ${theme === x.key ? "is-on" : ""}`}
                >
                  <svg className="ui-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={x.icon} />
                  </svg>
                  {th ? x.th : x.en}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
