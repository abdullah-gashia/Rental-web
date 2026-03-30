"use client";

import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string) => void;
  dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  show: (message) => {
    const id = `toast-${++toastCounter}`;

    set((state) => ({
      toasts: [...state.toasts, { id, message }],
    }));

    // Auto-dismiss after 2.8s (matching prototype's 2800ms timeout)
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 2800);
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
