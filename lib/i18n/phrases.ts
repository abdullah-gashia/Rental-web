import phrases from "./phrases.json";
import type { Locale } from "./dictionaries";

/**
 * The second half of the translation layer, keyed by the Thai text itself.
 *
 * `t("some_key")` works well for the shell and the shared vocabulary, where a
 * name for the string is worth having. It works badly for the long tail — the
 * fifteen hundred one-off sentences scattered through the pages — because every
 * one of those needs a key invented for it, and a key is a second thing that
 * can be wrong. Getting one wrong is silent: the page renders a real sentence,
 * just somebody else's.
 *
 * A sentence with a number in it keeps its shape: the Thai holds {0}, {1} and
 * so on where the values go, and the English holds them wherever English wants
 * them, which is often somewhere else entirely.
 *
 * So here the Thai source text is the key. Nothing has to line up, because
 * there is no second list to line up with, and a phrase that has not been
 * translated yet falls back to the Thai it was written as. A missing
 * translation shows the original sentence rather than the wrong one.
 */

const TABLE: Record<string, string> = phrases;

/** The shape of `tr`, for helpers that take one as an argument. */
export type TrFn = (
  source: string | null | undefined,
  params?: readonly (string | number | null | undefined)[],
) => string;

export function translatePhrase(
  locale: Locale,
  source: string | null | undefined,
  params?: readonly (string | number | null | undefined)[],
): string {
  const filled = (s: string) =>
    params ? s.replace(/\{(\d+)\}/g, (m, i) => String(params[Number(i)] ?? "")) : s;
  // Messages handed back by an action are often optional; an absent one is
  // an absent message, not the word "undefined".
  if (source == null) return "";
  if (locale !== "en") return filled(source);
  const hit = TABLE[source];
  if (hit) return filled(hit);
  // Leading/trailing space is common in JSX text and never meaningful.
  const trimmed = source.trim();
  const alt = TABLE[trimmed];
  if (!alt) {
    // A finished sentence with values already in it — a notification stored
    // in the database, or a message an action built — matched against the
    // phrase it was made from.
    if (!params) {
      const shaped = fromTemplate(trimmed, 0);
      if (shaped != null) return shaped;
    }
    return filled(source);
  }
  const lead = source.slice(0, source.length - source.trimStart().length);
  const tail = source.slice(source.trimEnd().length);
  return lead + filled(alt) + tail;
}

// ─── Finished sentences ────────────────────────────────────────────────────
//
// Plenty of Thai reaches the page already filled in: `สินค้า "Camera" ถูก
// ปฏิเสธ: blurry photo` was written to the notifications table that way, long
// before anybody chose a language. No key matches a sentence with a title in
// it, so every phrase that has {0}-style slots is also compiled into a pattern,
// and a sentence that misses the table is tried against those. The values are
// lifted out, translated themselves when they are known words ("ผู้ขาย" →
// "seller"), and put into the English.

const THAI_LETTER = /[ก-ฺเ-๛]/;
type Pattern = { re: RegExp; slots: number[]; en: string };
let PATTERNS: Pattern[] | null = null;

function patterns(): Pattern[] {
  if (PATTERNS) return PATTERNS;
  PATTERNS = [];
  for (const [key, en] of Object.entries(TABLE)) {
    if (!/\{\d+\}/.test(key)) continue;
    const parts = key.split(/(\{\d+\})/);
    // a pattern needs some Thai of its own to anchor on, or it matches anything
    if (!THAI_LETTER.test(parts.filter((p) => !/^\{\d+\}$/.test(p)).join(""))) continue;
    const slots: number[] = [];
    const src = parts.map((p) => {
      const m = p.match(/^\{(\d+)\}$/);
      if (m) { slots.push(Number(m[1])); return "([\\s\\S]*?)"; }
      return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    PATTERNS.push({ re: new RegExp("^" + src + "$"), slots, en });
  }
  // the most literal text first, so the most specific phrase wins
  PATTERNS.sort((a, b) => b.re.source.length - a.re.source.length);
  return PATTERNS;
}

/** A Buddhist-era date written into a stored sentence, moved to the Gregorian year. */
function gregorian(value: string): string {
  return value.replace(/\b(\d{1,2})\/(\d{1,2})\/(25\d\d)\b/g,
    (_, d, m, y) => `${d}/${m}/${Number(y) - 543}`);
}

/**
 * One value lifted out of a sentence. It may be a known word, a sentence of
 * its own, or a list — moderation reasons are stored joined with " · ", and
 * the words inside one with ", " — in which case each piece goes on its own.
 */
function valueInEnglish(raw: string, depth: number): string {
  const known = TABLE[raw] ?? TABLE[raw.trim()];
  if (known) return known;
  for (const sep of [" · ", ", "]) {
    if (!raw.includes(sep)) continue;
    const parts = raw.split(sep);
    const done = parts.map((part) => TABLE[part.trim()] ?? fromTemplate(part.trim(), depth + 1));
    // a list only when every piece is recognised; "Bangkok, Thailand" stays as it is
    if (done.every((d) => d != null)) return done.join(sep);
  }
  return fromTemplate(raw, depth + 1) ?? fromTemplate(raw.trim(), depth + 1) ?? gregorian(raw);
}

function fromTemplate(sentence: string, depth: number): string | null {
  if (depth > 2 || !THAI_LETTER.test(sentence)) return null;
  for (const p of patterns()) {
    const m = sentence.match(p.re);
    if (!m) continue;
    const values: string[] = [];
    p.slots.forEach((slot, i) => { values[slot] = valueInEnglish(m[i + 1], depth); });
    return p.en.replace(/\{(\d+)\}/g, (_, i, at: number, whole: string) => {
      const v = values[Number(i)] ?? "";
      // "the {0}" reads "the seller", not "the Seller"
      return /\bthe $/i.test(whole.slice(0, at)) ? v.charAt(0).toLowerCase() + v.slice(1) : v;
    });
  }
  return null;
}

export function phraseCount(): number {
  return Object.keys(TABLE).length;
}
