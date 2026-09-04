/**
 * The one place the session-signing secret is resolved.
 *
 * It used to fall back to the literal string "dev-secret-change-in-production"
 * in two files. That string is committed to a public repository, so any
 * deployment that lost its environment variable would have been signing
 * sessions with a key the whole internet can read — enough to forge an admin
 * cookie. Outside development this now refuses to start instead.
 */

const DEV_FALLBACK = "dev-only-insecure-secret-do-not-use-in-production";

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) is missing or too short. " +
      "Set a random 32+ character value before starting in production.",
    );
  }

  console.warn(
    "[auth] AUTH_SECRET not set — using a development-only fallback. " +
    "Sessions signed with it are not secure.",
  );
  return DEV_FALLBACK;
}
