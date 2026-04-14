"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import SearchFilters from "@/components/search/SearchFilters";
import { Suspense } from "react";
import ProductDetail from "@/components/items/ProductDetail";
import LoginModal from "@/components/forms/LoginModal";
import PostAdModal from "@/components/forms/PostAdModal";
import WishlistModal from "@/components/forms/WishlistModal";
import ChatModal from "@/components/chat/ChatModal";
import RecommendedSection from "@/app/_components/RecommendedSection";
import type { RecommendedItem } from "@/lib/actions/recommendations";

interface HomeClientProps {
  items: ItemWithDetails[];
  recommendedItems?:       RecommendedItem[];
  recommendationStrategy?: "personalized" | "trending" | "newest";
  // Initial values hydrated from server-read searchParams
  initialQ?:         string;
  initialCat?:       string;
  initialMinPrice?:  string;
  initialMaxPrice?:  string;
  initialCondition?: string;
  initialSort?:      string;
}

export default function HomeClient({
  items,
  recommendedItems       = [],
  recommendationStrategy = "trending",
  initialQ         = "",
  initialCat       = "all",
  initialMinPrice  = "",
  initialMaxPrice  = "",
  initialCondition = "",
  initialSort      = "newest",
}: HomeClientProps) {
  const router    = useRouter();
  const urlParams = useSearchParams(); // always-current URL params

  // Prevent the search debounce from firing on initial mount
  const searchDidMount = useRef(false);

  // ── Local state (initialized from server searchParams) ────────────────
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [activeCat,   setActiveCat]   = useState<CategorySlug>(initialCat as CategorySlug);
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | null>(null);

  // Chat state
  const [chatItem,    setChatItem]    = useState<ItemWithDetails | null>(null);
  const [chatConvId,  setChatConvId]  = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Zustand stores
  const activeModal = useModalStore((s) => s.activeModal);
  const open        = useModalStore((s) => s.open);
  const close       = useModalStore((s) => s.close);
  const user        = useAuthStore((s) => s.user);
  const showToast   = useToastStore((s) => s.show);

  // ── URL sync helpers ─────────────────────────────────────────────────

  /** Merge overrides into the live URL params — never clobbers unrelated keys. */
  function withParams(updates: Record<string, string>): string {
    const params = new URLSearchParams(urlParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      v ? params.set(k, v) : params.delete(k);
    }
    return `/?${params.toString()}`;
  }

  // Debounce search query → URL (500 ms) — skip on initial mount
  useEffect(() => {
    if (!searchDidMount.current) {
      searchDidMount.current = true;
      return;
    }
    const t = setTimeout(() => {
      router.replace(withParams({ q: searchQuery.trim() }), { scroll: false });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Immediate category change → URL
  function handleCatChange(cat: CategorySlug) {
    setActiveCat(cat);
    router.replace(
      withParams({ cat: cat === "all" ? "" : cat }),
      { scroll: false }
    );
  }

  // ── Derived display state ─────────────────────────────────────────────

  // When user has typed something or selected a non-"all" category →
  // show a flat "search results" grid instead of the sectioned home view.
  const isSearchActive =
    !!searchQuery.trim() ||
    activeCat !== "all"  ||
    !!initialMinPrice    ||
    !!initialMaxPrice    ||
    !!initialCondition   ||
    (initialSort && initialSort !== "newest");

  // Items are already server-filtered; we still split for the sectioned home view.
  const secondhandItems  = items.filter((i) => i.listingType === "SELL" && i.category.slug !== "electronics");
  const rentalItems      = items.filter((i) => i.listingType === "RENT");
  const electronicsItems = items.filter((i) => i.category.slug === "electronics");

  const showSecondhand  = activeCat === "all" || ["secondhand", "books"].includes(activeCat);
  const showRentals     = activeCat === "all" || activeCat === "rental";
  const showElectronics = activeCat === "all" || activeCat === "electronics";

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleItemClick = useCallback((item: ItemWithDetails) => {
    setSelectedItem(item);
    open("detail", item.id);
  }, [open]);

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
      if (result.error) { showToast(`⚠️ ${result.error}`); close(); return; }
      if (result.conversation) setChatConvId(result.conversation.id);
    } catch {
      showToast("⚠️ ไม่สามารถเปิดแชทได้");
    } finally {
      setChatLoading(false);
    }
  }, [user, open, close, showToast]);

  const handleChatClose = useCallback(() => {
    close();
    setChatItem(null);
    setChatConvId(null);
  }, [close]);

  const handleNavChatOpen = useCallback(async (
    itemId: string, sellerId: string, title: string, emoji: string | null, price: number
  ) => {
    if (!user) return;
    setChatItem({ id: itemId, title, emoji, price, seller: { id: sellerId } } as any);
    setChatConvId(null);
    setChatLoading(true);
    open("chat");
    try {
      const result = await getOrCreateConversation(itemId, sellerId);
      if (result.error) { showToast(`⚠️ ${result.error}`); close(); return; }
      if (result.conversation) setChatConvId(result.conversation.id);
    } catch {
      showToast("⚠️ ไม่สามารถเปิดแชทได้");
    } finally {
      setChatLoading(false);
    }
  }, [user, open, close, showToast]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCat={activeCat}
        onCatChange={handleCatChange}
        onChatOpen={handleNavChatOpen}
      />

      <main className="max-w-7xl mx-auto px-5 pt-8">
        <TrendingCarousel />
        <StatsBar totalItems={items.length} />

        {/* ── Advanced filter bar ──────────────────────────────────── */}
        <Suspense fallback={null}>
          <SearchFilters
            totalCount={items.length}
            initialMinPrice={initialMinPrice}
            initialMaxPrice={initialMaxPrice}
            initialCondition={initialCondition}
            initialSort={initialSort}
          />
        </Suspense>

        {/* ── Search results mode (flat grid) ─────────────────────── */}
        {isSearchActive ? (
          items.length > 0 ? (
            <ProductGrid
              title={
                searchQuery.trim()
                  ? `ผลการค้นหา "${searchQuery.trim()}"`
                  : "สินค้าที่พบ"
              }
              items={items}
              onItemClick={handleItemClick}
            />
          ) : (
            <EmptyState query={searchQuery.trim()} />
          )
        ) : (
          /* ── Sectioned home view ─────────────────────────────────── */
          <>
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

            {/* ── Personalized recommendations ─────────────────── */}
            {recommendedItems.length > 0 && (
              <RecommendedSection
                items={recommendedItems}
                strategy={recommendationStrategy}
                onItemClick={handleItemClick}
              />
            )}

            <RecentlyAdded items={items} onItemClick={handleItemClick} />
          </>
        )}
      </main>

      <Footer />

      {/* Mobile FAB */}
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
      <LoginModal    isOpen={activeModal === "login"}   onClose={close} />
      <PostAdModal   isOpen={activeModal === "postAd"}  onClose={close} />
      <WishlistModal
        isOpen={activeModal === "wishlist"}
        onClose={close}
        items={items}
        onItemClick={handleItemClick}
      />
      <ChatModal
        isOpen={activeModal === "chat"}
        onClose={handleChatClose}
        itemTitle={chatItem?.title ?? ""}
        itemEmoji={chatItem?.emoji ?? null}
        itemPrice={chatItem?.price ?? 0}
        conversationId={chatConvId}
        currentUserId={user?.id ?? null}
        convLoading={chatLoading}
        itemContext={chatItem ? {
          imageUrl:     chatItem.images?.find((i) => i.isMain)?.url ?? chatItem.images?.[0]?.url ?? null,
          contact:      chatItem.contact      ?? null,
          condition:    chatItem.condition    ?? null,
          negotiable:   chatItem.negotiable   ?? false,
          allowShipping: chatItem.allowShipping ?? false,
          allowMeetup:  chatItem.allowMeetup  ?? false,
          location:     chatItem.location     ?? null,
          listingType:  chatItem.listingType  ?? "SELL",
        } : undefined}
      />
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  const router = useRouter();

  function clearAll() {
    router.replace("/", { scroll: false });
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-4 select-none">🔍</div>
      <h3 className="text-xl font-bold text-[#111] mb-2">
        {query ? `ไม่พบสินค้าสำหรับ "${query}"` : "ไม่พบสินค้าที่ตรงกับตัวกรอง"}
      </h3>
      <p className="text-sm text-[#777] max-w-xs mb-6">
        ลองปรับคำค้นหาหรือตัวกรองให้กว้างขึ้น แล้วลองใหม่อีกครั้ง
      </p>
      <button
        onClick={clearAll}
        className="text-sm font-semibold text-[#e8500a] bg-[#e8500a]/8 hover:bg-[#e8500a]/15 border border-[#e8500a]/20 px-5 py-2.5 rounded-xl transition"
      >
        ล้างการค้นหาทั้งหมด
      </button>
    </div>
  );
}
