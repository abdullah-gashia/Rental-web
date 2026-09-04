import { randomInt } from "crypto";

/**
 * Marker inside the notification that carries a freshly generated password.
 *
 * Lives here rather than in lib/auth.ts so lib/prisma.ts can match on it
 * without importing auth, which would close an import cycle.
 */
export const GENERATED_PASSWORD_NOTICE = "รหัสผ่านที่ระบบสร้างให้";

/**
 * Characters that can't be confused when read off a screen:
 * no 0/O, no 1/l/I. Keeps a hand-copied password from failing to log in.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** How many characters an auto-generated password gets. */
export const GENERATED_PASSWORD_LENGTH = 8;

/**
 * Cryptographically random password for accounts created through an OAuth
 * provider, which arrive with no password of their own.
 *
 * Uses crypto.randomInt (not Math.random) so the output isn't predictable.
 */
export function generatePassword(length = GENERATED_PASSWORD_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}
