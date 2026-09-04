"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ItemWithDetails, CategorySlug } from "@/lib/types";
import { useModalStore } from "@/lib/stores/modal-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { getOrCreateConversation } from "@/lib/actions/chat-actions";

import Navbar from "@/components/layout/Navbar";
import SideRail from "@/components/layout/SideRail";
import Footer from "@/components/layout/Footer";
import HeroMosaic from "@/app/_components/HeroMosaic";
import StatsBar from "@/components/sections/StatsBar";
import ProductGrid from "@/components/items/ProductGrid";
import ProductPanel from "@/components/items/ProductPanel";
import RecentlyAdded from "@/components/sections/RecentlyAdded";
import SearchFilters from "@/components/search/SearchFilters";
import ProductDetail from "@/components/items/ProductDetail";
import LoginModal from "@/components/forms/LoginModal";
import PostAdModal from "@/components/forms/PostAdModal";
import WishlistModal from "@/components/forms/WishlistModal";
import ChatModal from "@/components/chat/ChatModal";
import RecommendedSection from "@/app/_components/RecommendedSection";
import type { RecommendedItem } from "@/lib/actions/recommendations";

interface HomeClientProps {
  items: ItemWithDetails[];
  trendingItems?:          any[];
  recommendedItems?:       RecommendedItem[];
  recommendationStrategy?: "personalized" | "trending" | "newest";
  // Initial values hydrated from server-read searchParams
  initialQ?:         string;
  initialCat?:       string;
  initialMinPrice?:  string;
  initialMaxPrice?:  string;
  initialCondition?: string;
  initialSort?:      string;
  /** Error code handed back by Auth.js after a failed OAuth attempt */
  authError?:        string;
  verifiedSellers?:  number;
  avgRating?:        number;
  reviewCount?:      number;
}

export default function HomeClient({
  items,
  trendingItems              = [],
  recommendedItems       = [],
  recommendationStrategy = "trending",
  initialQ         = "",
  initialCat       = "all",
  initialMinPrice  = "",
  initialMaxPrice  = "",
  initialCondition = "",
  initialSort      = "newest",
  authError,
  verifiedSellers = 0,
  avgRating       = 0,
  reviewCount     = 0,
}: HomeClientProps) {
  const router    = useRouter();
  const urlParams = useSearchParams(); // always-current URL params

  // Prevent the search debounce from firing on initial mount
  const searchDidMount = useRef(false);

  // An OAuth bounce-back only needs handling once per page load
  const authErrorHandled = useRef(false);
  const [loginError, setLoginError] = useState("");

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

  // ── OAuth error bounce-back ──────────────────────────────────────────
  // Auth.js sends failures to "/" as ?error=<code> (pages.error in lib/auth.ts).
  useEffect(() => {
    if (!authError || authErrorHandled.current) return;
    authErrorHandled.current = true;

    const messages: Record<string, string> = {
      // The e-mail already belongs to an account that signs in with a password
      OAuthAccountNotLinked:
        "อีเมลนี้มีบัญชีที่ใช้รหัสผ่านอยู่แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านด้านล่าง",
      AccessDenied:  "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
      OAuthSignin:   "ไม่สามารถเริ่มการเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่",
      OAuthCallback: "การเชื่อมต่อกับ Google ล้มเหลว กรุณาลองใหม่",
      Configuration: "ระบบเข้าสู่ระบบด้วย Google ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ",
    };

    setLoginError(messages[authError] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    open("login");

    // Drop ?error= so a refresh doesn't replay the message
    const params = new URLSearchParams(urlParams.toString());
    params.delete("error");
    router.replace(params.toString() ? `/?${params.toString()}` : "/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authError]);

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
    <div className="hp-root min-h-screen">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCat={activeCat}
        onCatChange={handleCatChange}
        onChatOpen={handleNavChatOpen}
      />

      <SideRail activeCat={activeCat} onCatChange={handleCatChange} />

      {/* Everything sits to the right of the rail on desktop */}
      <div className="md:pl-[68px]">
        <main className="max-w-[1760px] mx-auto px-3 sm:px-5 pt-2 pb-20">
          {/* Spotlight + stats belong to the browse view only */}
          {!isSearchActive && (
            <>
              <HeroMosaic items={trendingItems} onItemClick={(id) => {
                const item = items.find((i) => i.id === id);
                if (item) handleItemClick(item);
              }} />
              <StatsBar
                totalItems={items.length}
                verifiedSellers={verifiedSellers}
                avgRating={avgRating}
                reviewCount={reviewCount}
              />
            </>
          )}

          {/* ── Filter toolbar ─────────────────────────────────────── */}
          {/* No Suspense boundary needed: page.tsx is force-dynamic, so
              useSearchParams() never triggers a static-prerender bailout. */}
          <div className="hp-panel !py-2 mb-5">
            <SearchFilters
              totalCount={items.length}
              initialMinPrice={initialMinPrice}
              initialMaxPrice={initialMaxPrice}
              initialCondition={initialCondition}
              initialSort={initialSort}
            />
          </div>

          {/* ── Search results mode ────────────────────────────────── */}
          {isSearchActive ? (
            items.length > 0 ? (
              <ProductGrid
                title={
                  searchQuery.trim()
                    ? `“${searchQuery.trim()}”`
                    : "สินค้าที่พบ"
                }
                items={items}
                onItemClick={handleItemClick}
              />
            ) : (
              <EmptyState query={searchQuery.trim()} />
            )
          ) : (
            /* ── Browse view — panelled sections ──────────────────── */
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 items-start gap-4 xl:gap-5 mb-5">
                {showSecondhand && (
                  <ProductPanel
                    title="สินค้ามือสอง"
                    items={secondhandItems}
                    onTitleClick={() => handleCatChange("secondhand")}
                    onItemClick={handleItemClick}
                  />
                )}
                {showRentals && (
                  <ProductPanel
                    title="สินค้าปล่อยเช่า"
                    items={rentalItems}
                    onTitleClick={() => handleCatChange("rental")}
                    onItemClick={handleItemClick}
                  />
                )}
                {showElectronics && (
                  <ProductPanel
                    title="อิเล็กทรอนิกส์"
                    items={electronicsItems}
                    onTitleClick={() => handleCatChange("electronics")}
                    onItemClick={handleItemClick}
                  />
                )}

                {recommendedItems.length > 0 && (
                  <RecommendedSection
                    items={recommendedItems}
                    strategy={recommendationStrategy}
                    onItemClick={handleItemClick}
                  />
                )}
              </div>

              <RecentlyAdded items={items} onItemClick={handleItemClick} />
            </>
          )}
        </main>

        <Footer />
      </div>

      {/* Mobile FAB */}
      {user?.role !== "ADMIN" && (
        <button
          onClick={() => open("postAd")}
          id="floatBtn"
          className="fixed bottom-6 right-5 z-40 items-center gap-2 bg-[var(--psu-navy)] text-white font-semibold text-[13px] px-4 py-3 rounded-lg hover:bg-[var(--psu-navy-800)] transition-colors"
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
      <LoginModal
        isOpen={activeModal === "login"}
        onClose={() => { setLoginError(""); close(); }}
        initialError={loginError}
      />
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
    <div className="border border-[var(--hp-border)] rounded-lg bg-[var(--hp-subtle)] py-16 px-6 flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-lg bg-white border border-[var(--hp-border)] flex items-center justify-center mb-4">
        <svg className="w-4 h-4 text-[var(--hp-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--hp-ink)] mb-1.5">
        {query ? `ไม่พบสินค้าสำหรับ “${query}”` : "ไม่พบสินค้าที่ตรงกับตัวกรอง"}
      </h3>
      <p className="text-[13px] text-[var(--hp-muted)] max-w-xs mb-5 leading-relaxed">
        ลองปรับคำค้นหาหรือตัวกรองให้กว้างขึ้น แล้วลองใหม่อีกครั้ง
      </p>
      <button onClick={clearAll} className="hp-btn hp-btn-ghost">
        ล้างการค้นหาทั้งหมด
      </button>
    </div>
  );
}
