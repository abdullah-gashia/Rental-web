import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
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
 *
 * A signed-in reader also has a saved language on their account. That is the
 * one they chose, so on a browser with no cookie yet — a new device, or after
 * clearing site data — it decides, and the cookie is written from it on the
 * next save. Without that the setting looked disconnected: the radio showed
 * English because the account said so, and the page came back Thai because
 * this browser had never been told.
 */

export const LOCALE_COOKIE = "psu-lang";
export const THEME_COOKIE  = "psu-theme";

export type ThemeChoice = "light" | "dark" | "system";

/** The saved language on the account, looked up at most once per request. */
const savedLocale = cache(async (): Promise<Locale | null> => {
  try {
    const { currentUser } = await import("@/lib/permissions");
    const user = await currentUser();
    if (!user) return null;
    const { prisma } = await import("@/lib/prisma");
    const prefs = await prisma.userPreferences.findUnique({
      where:  { userId: user.id },
      select: { language: true },
    });
    return prefs?.language === "en" ? "en" : prefs?.language === "th" ? "th" : null;
  } catch {
    return null;                      // never let the language break a page
  }
});

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const cookie = jar.get(LOCALE_COOKIE)?.value;
  if (cookie === "en" || cookie === "th") return cookie;
  return (await savedLocale()) ?? "th";
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
