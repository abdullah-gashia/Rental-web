"use client";

import { useState, useMemo, useCallback } from "react";
import type { ItemWithDetails, CategorySlug } from "@/lib/types";
import { useModalStore } from "@/lib/stores/modal-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { getOrCreateConversation } from "@/lib/actions/chat-actions";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TrendingCarousel from "@/components/items/TrendingCarousel";
import StatsBar from "@/components/sections/StatsBar";
import ProductGrid from "@/components/items/ProductGrid";
import RecentlyAdded from "@/components/sections/RecentlyAdded";
import ProductDetail from "@/components/items/ProductDetail";
import LoginModal from "@/components/forms/LoginModal";
import PostAdModal from "@/components/forms/PostAdModal";
import WishlistModal from "@/components/forms/WishlistModal";
import ChatModal from "@/components/chat/ChatModal";

interface HomeClientProps {
  items: ItemWithDetails[];
}

export default function HomeClient({ items }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CategorySlug>("all");
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | null>(null);
  const { activeModal, open, close } = useModalStore();

  // Chat state
  const [chatItem, setChatItem] = useState<ItemWithDetails | null>(null);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  // Filter items by category and search
  const catFilter = (item: ItemWithDetails) => {
    switch (activeCat) {
      case "all": return true;
      case "secondhand": return ["secondhand", "books"].includes(item.category.slug);
      case "rental": return item.listingType === "RENT";
      case "electronics": return item.category.slug === "electronics";
      case "vehicles": return item.category.slug === "vehicles";
      case "boardgames": return item.category.slug === "boardgames";
      case "books": return item.category.slug === "books";
      default: return true;
    }
  };

  const searchFilter = (item: ItemWithDetails) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || (item.seller.name || "").toLowerCase().includes(q);
  };

  const filtered = useMemo(
    () => items.filter((i) => catFilter(i) && searchFilter(i)),
    [items, activeCat, searchQuery]
  );

  const secondhandItems = filtered.filter((i) => i.listingType === "SELL" && !["electronics"].includes(i.category.slug));
  const rentalItems = filtered.filter((i) => i.listingType === "RENT");
  const electronicsItems = filtered.filter((i) => i.category.slug === "electronics");

  const showSecondhand = activeCat === "all" || ["secondhand", "books"].includes(activeCat);
  const showRentals = activeCat === "all" || activeCat === "rental";
  const showElectronics = activeCat === "all" || activeCat === "electronics";

  const handleItemClick = (item: ItemWithDetails) => {
    setSelectedItem(item);
    open("detail", item.id);
  };

  // ─── Chat Logic ────────────────────────────────────
  const handleChatClick = useCallback(async (item: ItemWithDetails) => {
    if (!user) {
      showToast("⚠️ กรุณาเข้าสู่ระบบก่อนแชท");
      open("login");
      return;
    }

    setChatItem(item);
    setChatConvId(null);
    setChatLoading(true);
    open("chat");

    try {
      const result = await getOrCreateConversation(item.id, item.seller.id);

      if (result.error) {
        showToast(`⚠️ ${result.error}`);
        close();
        return;
      }

      if (result.conversation) {
        setChatConvId(result.conversation.id);
      }
    } catch {
      showToast("⚠️ ไม่สามารถเปิดแชทได้");
    } finally {
      setChatLoading(false);
    }
  }, [user, open, close, showToast]);

  const handleChatClose = () => {
    close();
    setChatItem(null);
    setChatConvId(null);
  };

  // Handler for opening chat from the navbar ChatDropdown
  const handleNavChatOpen = useCallback(async (
    itemId: string, sellerId: string, title: string, emoji: string | null, price: number
  ) => {
    if (!user) return;

    // Create a minimal chat item for the modal header
    setChatItem({ id: itemId, title, emoji, price, seller: { id: sellerId } } as any);
    setChatConvId(null);
    setChatLoading(true);
    open("chat");

    try {
      const result = await getOrCreateConversation(itemId, sellerId);
      if (result.error) {
        showToast(`⚠️ ${result.error}`);
        close();
        return;
      }
      if (result.conversation) {
        setChatConvId(result.conversation.id);
      }
    } catch {
      showToast("⚠️ ไม่สามารถเปิดแชทได้");
    } finally {
      setChatLoading(false);
    }
  }, [user, open, close, showToast]);

  return (
    <div className="min-h-screen pb-24">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCat={activeCat}
        onCatChange={setActiveCat}
        onChatOpen={handleNavChatOpen}
      />

      <main className="max-w-7xl mx-auto px-5 pt-8">
        <TrendingCarousel />
        <StatsBar totalItems={items.length} />

        {showSecondhand && (
          <ProductGrid
            title="สินค้ามือสอง"
            items={secondhandItems}
            onItemClick={handleItemClick}
          />
        )}

        {showRentals && (
          <ProductGrid
            title="สินค้าปล่อยเช่า"
            items={rentalItems}
            onItemClick={handleItemClick}
          />
        )}

        {showElectronics && (
          <ProductGrid
            title="อิเล็กทรอนิกส์"
            items={electronicsItems}
            onItemClick={handleItemClick}
          />
        )}

        <RecentlyAdded items={filtered} onItemClick={handleItemClick} />
      </main>

      <Footer />

      {/* Mobile FAB — hidden for admins */}
      {user?.role !== "ADMIN" && (
        <button
          onClick={() => open("postAd")}
          id="floatBtn"
          className="fixed bottom-6 right-5 z-40 items-center gap-2 bg-[#e8500a] text-white font-semibold text-sm px-5 py-3.5 rounded-2xl shadow-xl hover:bg-[#c94208] transition"
        >
          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          ลงประกาศ
        </button>
      )}

      {/* Modals */}
      <ProductDetail
        item={selectedItem}
        isOpen={activeModal === "detail"}
        onClose={close}
        onChatClick={handleChatClick}
      />
      <LoginModal isOpen={activeModal === "login"} onClose={close} />
      <PostAdModal isOpen={activeModal === "postAd"} onClose={close} />
      <WishlistModal isOpen={activeModal === "wishlist"} onClose={close} items={items} onItemClick={handleItemClick} />
      <ChatModal
        isOpen={activeModal === "chat"}
        onClose={handleChatClose}
        itemTitle={chatItem?.title || ""}
        itemEmoji={chatItem?.emoji || null}
        itemPrice={chatItem?.price || 0}
        conversationId={chatConvId}
        currentUserId={user?.id || null}
        convLoading={chatLoading}
      />
    </div>
  );
}
