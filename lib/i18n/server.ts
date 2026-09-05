import "server-only";
import { cookies } from "next/headers";
import { type Locale, type DictionaryKey, translate } from "./dictionaries";
import { translatePhrase } from "./phrases";

/**
 * Language and theme on the server.
 *
 * The locale lived only in a zustand store, which is browser state — so every
 * server-rendered page (the whole admin panel, the consoles, the borrowing
 * pages) was hard-coded Thai no matter what the user had chosen. Cookies are
 * readable in both places, so they are the only thing both halves can agree on.
 *
 * The client store writes the same two cookies; see lib/stores/locale-store.ts
 * and lib/stores/theme-store.ts.
 */

export const LOCALE_COOKIE = "psu-lang";
export const THEME_COOKIE  = "psu-theme";

export type ThemeChoice = "light" | "dark" | "system";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return jar.get(LOCALE_COOKIE)?.value === "en" ? "en" : "th";
}

export async function getTheme(): Promise<ThemeChoice> {
  const jar = await cookies();
  const v = jar.get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : "system";
}

export type TFunction = (key: DictionaryKey, params?: Record<string, string | number>) => string;

/** A `t` bound to the request's locale, for use in server components. */
export async function getT(): Promise<TFunction> {
  const locale = await getLocale();
  return (key, params) => translate(locale, key, params);
}

/** Both at once, when a page needs the locale itself (dates, number formats). */
export async function getI18n(): Promise<{ locale: Locale; t: TFunction }> {
  const locale = await getLocale();
  return { locale, t: (key, params) => translate(locale, key, params) };
}

export type TrFunction = (source: string | null | undefined, params?: readonly (string | number | null | undefined)[]) => string;

/** Translate by Thai source text, for server components. Falls back to Thai. */
export async function getTr(): Promise<TrFunction> {
  const locale = await getLocale();
  return (source, params) => translatePhrase(locale, source, params);
}
