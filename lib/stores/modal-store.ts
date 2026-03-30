"use client";

import { create } from "zustand";

type ModalName =
  | "login"
  | "postAd"
  | "detail"
  | "wishlist"
  | "chat"
  | null;

interface ModalState {
  /** Currently open modal name, or null if none open */
  activeModal: ModalName;
  /** ID of the item being viewed in the detail modal */
  detailItemId: string | null;
  /** Open a modal by name */
  open: (name: ModalName, itemId?: string) => void;
  /** Close the currently active modal */
  close: () => void;
  /** Check if a specific modal is open */
  isOpen: (name: ModalName) => boolean;
}

export const useModalStore = create<ModalState>()((set, get) => ({
  activeModal: null,
  detailItemId: null,

  open: (name, itemId) =>
    set({
      activeModal: name,
      detailItemId: itemId ?? null,
    }),

  close: () =>
    set({
      activeModal: null,
      detailItemId: null,
    }),

  isOpen: (name) => get().activeModal === name,
}));
