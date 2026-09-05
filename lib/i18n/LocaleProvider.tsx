"use client";

import { createContext, useContext, useMemo } from "react";
import { type Locale, type DictionaryKey, translate } from "./dictionaries";
import { translatePhrase } from "./phrases";

/**
 * The locale a client component should translate with.
 *
 * It used to come from the zustand store, which reads the cookie off
 * `document`. On the server there is no document, so every client component
 * was server-rendered in Thai and then re-rendered in English the moment it
 * hydrated: React reported a hydration mismatch, threw the server's markup
 * away and rebuilt the tree, and the reader saw a flash of Thai first.
 *
 * The server knows the locale — it reads the same cookie through next/headers
 * — so it passes it down here instead. Both renders then agree, and there is
 * nothing to reconcile.
 *
 * Context rather than a module-level store for a second reason: a store is one
 * object shared by every request the server is handling at once, so two people
 * reading in different languages would overwrite each other.
 */

const LocaleContext = createContext<Locale>("th");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Translate by Thai source text. Falls back to the Thai it was written as. */
export function useTr() {
  const locale = useContext(LocaleContext);
  return useMemo(
    () =>
      (source: string | null | undefined, params?: readonly (string | number | null | undefined)[]) =>
        translatePhrase(locale, source, params),
    [locale],
  );
}

/** Translate by key, for the shell and the shared vocabulary. */
export function useT() {
  const locale = useContext(LocaleContext);
  return useMemo(
    () =>
      (key: DictionaryKey, params?: Record<string, string | number>) =>
        translate(locale, key, params),
    [locale],
  );
}
