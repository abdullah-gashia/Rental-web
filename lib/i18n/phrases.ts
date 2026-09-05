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
 * So here the Thai source text is the key. Nothing has to line up, because
 * there is no second list to line up with, and a phrase that has not been
 * translated yet falls back to the Thai it was written as. A missing
 * translation shows the original sentence rather than the wrong one.
 */

const TABLE: Record<string, string> = phrases;

export function translatePhrase(locale: Locale, source: string): string {
  if (locale !== "en") return source;
  const hit = TABLE[source];
  if (hit) return hit;
  // Leading/trailing space is common in JSX text and never meaningful.
  const trimmed = source.trim();
  const alt = TABLE[trimmed];
  if (!alt) return source;
  const lead = source.slice(0, source.length - source.trimStart().length);
  const tail = source.slice(source.trimEnd().length);
  return lead + alt + tail;
}

export function phraseCount(): number {
  return Object.keys(TABLE).length;
}
