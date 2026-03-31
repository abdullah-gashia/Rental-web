"use client";

/**
 * AuthInitializer — runs on every page mount and re-hydrates
 * the Zustand auth store from the NextAuth JWT session cookie.
 *
 * Why this exists:
 * Zustand is in-memory only. It resets to {user: null} on every
 * full-page load / navigation. NextAuth keeps the session in an
 * HttpOnly JWT cookie, but client components have no way to read
 * HttpOnly cookies directly. The NextAuth-provided /api/auth/session
 * endpoint reads the cookie server-side and returns the user object
 * as JSON — we fetch that here on mount to re-hydrate the store.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AuthInitializer() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout  = useAuthStore((s) => s.logout);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.id) {
          setUser({
            id:    session.user.id,
            name:  session.user.name  ?? null,
            email: session.user.email,
            image: session.user.image ?? null,
            role:  session.user.role  ?? "STUDENT",
          });
        } else {
          // Cookie expired or no session — ensure store is clean
          logout();
        }
      })
      .catch(() => {
        // Network error: don't thrash the store
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null; // renders nothing
}
