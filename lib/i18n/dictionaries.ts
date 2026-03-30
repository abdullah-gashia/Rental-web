import th from "./th.json";
import en from "./en.json";

export type Locale = "th" | "en";
export type DictionaryKey = keyof typeof th;

const dictionaries: Record<Locale, Record<string, string>> = { th, en };

/**
 * Get the full dictionary for a locale.
 */
export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

/**
 * Translate a key with optional interpolation.
 * Usage: t("post_step", { step: "2" })  → "ขั้นตอนที่ 2 จาก 3"
 */
export function translate(
  locale: Locale,
  key: DictionaryKey,
  params?: Record<string, string | number>
): string {
  let value = dictionaries[locale][key] ?? dictionaries.th[key] ?? key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(`{${k}}`, String(v));
    });
  }

  return value;
}
