"use client";

import { create } from "zustand";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ADMIN" | "STUDENT";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));
