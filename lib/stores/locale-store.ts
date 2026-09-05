"use client";

import { create } from "zustand";
import { type Locale, type DictionaryKey, translate } from "@/lib/i18n/dictionaries";
import { translatePhrase } from "@/lib/i18n/phrases";

/**
 * Language, held in a cookie and nothing else.
 *
 * It used to live in a zustand `persist` store, which is browser-only — so
 * every server-rendered page (the whole admin panel, the consoles, the
 * borrowing pages) stayed Thai however the switch was set. Keeping localStorage
 * alongside the cookie was worse still: the two disagreed on the first render
 * and the store overwrote whatever the server had just used.
 */

const COOKIE = "psu-lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(): Locale {
  if (typeof document === "undefined") return "th";
  return /(?:^|;\s*)psu-lang=en\b/.test(document.cookie) ? "en" : "th";
}

function writeCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: DictionaryKey, params?: Record<string, string | number>) => string;
  tr: (source: string) => string;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: readCookie(),

  setLocale: (locale) => {
    if (locale === get().locale) return;
    writeCookie(locale);
    set({ locale });
    // Server components already rendered in the old language, so the page has
    // to come back from the server before the change is complete.
    if (typeof window !== "undefined") window.location.reload();
  },

  toggleLocale: () => get().setLocale(get().locale === "th" ? "en" : "th"),

  t: (key, params) => translate(get().locale, key, params),

  tr: (source) => translatePhrase(get().locale, source),
}));
