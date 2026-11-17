import type { Locale } from "./dictionaries";

/**
 * The locale tag to hand to toLocaleDateString and friends.
 *
 * "th-TH" writes Thai month names and the Buddhist year (9 ก.ย. 2569), which
 * is exactly what an English reader should not see. en-GB gives day-month-
 * year in English with the Gregorian year (9 Sept 2026), the closest match to
 * how the Thai version reads.
 *
 * Numbers are not routed through here: Thai and English write them the same.
 */
export function dateTag(locale: Locale): string {
  return locale === "en" ? "en-GB" : "th-TH";
}
