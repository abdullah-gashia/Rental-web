"use client";

import { create } from "zustand";

export type ThemeChoice = "light" | "dark" | "system";

const COOKIE = "psu-theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * The cookie is the only record, deliberately.
 *
 * With localStorage as well, the two disagreed: the server stamped data-theme
 * from the cookie, then the store rehydrated from localStorage and removed the
 * attribute again, so a dark preference lasted until the page finished loading
 * and then vanished. One source cannot desync with itself.
 */
function readCookie(): ThemeChoice {
  if (typeof document === "undefined") return "system";
  const m = document.cookie.match(/(?:^|;\s*)psu-theme=(light|dark|system)/);
  return (m?.[1] as ThemeChoice) ?? "system";
}

function writeCookie(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * Stamps the choice on <html>.
 *
 * "system" removes the attribute rather than setting it to anything, which is
 * what lets the prefers-color-scheme block in globals.css take over. Setting
 * data-theme="system" would match neither selector and leave a dark machine
 * on the light palette.
 */
function apply(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

interface ThemeState {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readCookie(),
  setTheme: (theme) => {
    writeCookie(theme);
    apply(theme);
    set({ theme });
  },
}));
