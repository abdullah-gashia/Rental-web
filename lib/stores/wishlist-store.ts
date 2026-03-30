"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  /** Set of item IDs in the wishlist */
  items: Set<string>;
  /** Check if an item is wishlisted */
  has: (itemId: string) => boolean;
  /** Toggle an item in/out of the wishlist */
  toggle: (itemId: string) => boolean;
  /** Remove an item from the wishlist */
  remove: (itemId: string) => void;
  /** Clear all items */
  clear: () => void;
  /** Number of items in the wishlist */
  count: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: new Set<string>(),

      has: (itemId) => get().items.has(itemId),

      toggle: (itemId) => {
        const items = new Set(get().items);
        const isAdding = !items.has(itemId);

        if (isAdding) {
          items.add(itemId);
        } else {
          items.delete(itemId);
        }

        set({ items });
        return isAdding;
      },

      remove: (itemId) => {
        const items = new Set(get().items);
        items.delete(itemId);
        set({ items });
      },

      clear: () => set({ items: new Set() }),

      count: () => get().items.size,
    }),
    {
      name: "psu-wishlist",
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          if (!value) return null;
          const parsed = JSON.parse(value);
          // Rehydrate Set from array
          if (parsed?.state?.items) {
            parsed.state.items = new Set(parsed.state.items);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Serialize Set to array for JSON storage
          const serialized = {
            ...value,
            state: {
              ...value.state,
              items: Array.from(value.state.items),
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
