"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Locale, type DictionaryKey, translate } from "@/lib/i18n/dictionaries";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: DictionaryKey, params?: Record<string, string | number>) => string;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "th",

      setLocale: (locale) => set({ locale }),

      toggleLocale: () =>
        set((state) => ({ locale: state.locale === "th" ? "en" : "th" })),

      t: (key, params) => translate(get().locale, key, params),
    }),
    {
      name: "psu-locale",
    }
  )
);
