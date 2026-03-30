"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import { useWishlistStore } from "@/lib/stores/wishlist-store";
import { useModalStore } from "@/lib/stores/modal-store";
import type { ItemWithDetails } from "@/lib/types";
import Modal from "@/components/ui/Modal";

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemWithDetails[];
  onItemClick: (item: ItemWithDetails) => void;
}

export default function WishlistModal({ isOpen, onClose, items, onItemClick }: WishlistModalProps) {
  const t = useLocaleStore((s) => s.t);
  const wishlistStore = useWishlistStore();

  const wishedItems = items.filter((i) => wishlistStore.has(i.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{t("wishlist_title")}</h2>
        <button onClick={onClose} className="text-[#9a9590] hover:text-[#111] text-xl leading-none">✕</button>
      </div>

      {wishedItems.length === 0 ? (
        <div className="text-center py-12 text-[#9a9590]">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-sm">{t("wishlist_empty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {wishedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 border border-[#e5e3de] rounded-[14px] cursor-pointer hover:bg-[#f7f6f3] transition"
              onClick={() => { onClose(); onItemClick(item); }}
            >
              <div
                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ background: item.color || "#f0ede7" }}
              >
                {item.images.length > 0 ? (
                  <img src={item.images[0].url} className="w-full h-full object-cover" alt="" />
                ) : (
                  item.emoji || "📦"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate">{item.title}</p>
                <p className="text-[13px] font-bold" style={{ color: item.listingType === "RENT" ? "#1d4ed8" : "#e8500a" }}>
                  {item.price.toLocaleString()} ฿{item.listingType === "RENT" ? t("per_day") : ""}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); wishlistStore.toggle(item.id); }}
                className="text-[#ef4444] text-xl bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                ♥
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
