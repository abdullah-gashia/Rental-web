import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authSecret } from "@/lib/auth-secret";

/**
 * Edge gatekeeper.
 *
 * Three jobs, in order: shut banned accounts out, keep signed-out visitors and
 * non-admins away from pages that are not theirs, and stamp security headers on
 * every response.
 *
 * The page components check permission again on the server. That duplication is
 * deliberate — this layer can be bypassed by a mistake in the matcher, and a
 * page that only trusts the middleware would then be wide open.
 */

// Paths a banned account (and an unauthenticated request) may always reach
const ALWAYS_ALLOWED = [
  "/banned",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/public",
];

/** Signing in is required to see these at all. */
const AUTH_REQUIRED = [
  "/dashboard",
  "/settings",
  "/orders",
  "/rental",
  "/profile",
];

/** ADMIN role required. */
const ADMIN_ONLY = ["/admin"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Headers applied to every response.
 *
 * No Content-Security-Policy here: Next.js injects inline bootstrap scripts, so
 * a CSP without a per-request nonce would break hydration rather than protect
 * anything. The rest are cheap and unconditional.
 */
function harden(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");          // no clickjacking frames
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets: nothing to authorise, but still worth the headers.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/)
  ) {
    return harden(NextResponse.next());
  }

  const token = await getToken({ req: request, secret: authSecret() });

  const isApi = pathname.startsWith("/api/");

  // ── Ban enforcement ───────────────────────────────────────────────────────
  if (token?.isBanned && !startsWithAny(pathname, ALWAYS_ALLOWED)) {
    return isApi
      ? NextResponse.json({ error: "Account suspended" }, { status: 403 })
      : harden(NextResponse.redirect(new URL("/banned", request.url)));
  }

  // ── Admin area ────────────────────────────────────────────────────────────
  if (startsWithAny(pathname, ADMIN_ONLY)) {
    if (token?.role !== "ADMIN") {
      // 404 rather than 403 for signed-in non-admins: there is no reason to
      // confirm to a stranger that /admin/lending is a real page.
      return isApi
        ? NextResponse.json({ error: "Not found" }, { status: 404 })
        : harden(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  // ── Signed-in-only areas ──────────────────────────────────────────────────
  if (!token && startsWithAny(pathname, AUTH_REQUIRED)) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Send them home; the login modal lives there.
    const home = new URL("/", request.url);
    home.searchParams.set("login", "1");
    return harden(NextResponse.redirect(home));
  }

  return harden(NextResponse.next());
}

export const config = {
  // Run on all paths except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
