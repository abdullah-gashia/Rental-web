import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that banned users (and unauthenticated requests) may always access
const ALWAYS_ALLOWED = [
  "/banned",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/public",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets quickly
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req:    request,
    secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production",
  });

  // ── Ban enforcement ───────────────────────────────────────────────────────
  if (token?.isBanned) {
    const isAllowed = ALWAYS_ALLOWED.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/banned", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
