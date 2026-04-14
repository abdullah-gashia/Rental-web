"use client";

import { useState } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToastStore } from "@/lib/stores/toast-store";
import type { ItemWithDetails } from "@/lib/types";
import StarRating from "@/components/ui/StarRating";
import WishlistButton from "@/components/ui/WishlistButton";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import CountdownTimer from "@/components/ui/CountdownTimer";
import ImageGallery from "@/components/items/ImageGallery";
import CheckoutWizard from "@/components/checkout/CheckoutWizard";
import { useTrackView } from "@/lib/hooks/useTrackView";

const GRACE_MS = 24 * 60 * 60 * 1000;

interface ProductDetailProps {
  item: ItemWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onChatClick?: (item: ItemWithDetails) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductDetail({ item, isOpen, onClose, onChatClick }: ProductDetailProps) {
  const t = useLocaleStore((s) => s.t);
  // Two separate selectors — avoids returning a new object literal on every call,
  // which would break useSyncExternalStore's stable-snapshot requirement.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);

  // ── Silent view tracking — fires once per modal open, never blocks UI ──
  useTrackView({
    enabled:         isOpen && !!item,
    isAuthenticated,
    itemId:          item?.id          ?? "",
    category:        item?.category.slug ?? "",
    price:           item?.price        ?? 0,
    source:          "browse",
  });
  const showToast = useToastStore((s) => s.show);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!item) return null;

  const gracePeriodExpiry = item.scheduledForDeletionAt
    ? new Date(new Date(item.scheduledForDeletionAt).getTime() + GRACE_MS)
    : null;
  const isInGracePeriod = gracePeriodExpiry !== null && gracePeriodExpiry > new Date();

  const conditionMap: Record<string, string> = {
    LIKE_NEW: t("post_cond_like_new"),
    GOOD: t("post_cond_good"),
    FAIR: t("post_cond_fair"),
    NEEDS_REPAIR: t("post_cond_needs_repair"),
  };

  const priceColor = item.listingType === "RENT" ? "#1d4ed8" : "#111";
  const priceDisplay =
    item.listingType === "RENT"
      ? `${item.price.toLocaleString()} ฿${t("per_day")}`
      : `${item.price.toLocaleString()} ฿`;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} wide>
      <div className="flex">
        {/* Image panel */}
        <div className="hidden md:flex w-64 flex-shrink-0 bg-[#f7f6f3] rounded-l-2xl p-6 flex-col gap-3">
          <ImageGallery
            images={item.images}
            emoji={item.emoji}
            color={item.color}
            title={item.title}
          />
        </div>

        {/* Content panel */}
        <div className="flex-1 p-7 overflow-y-auto">
          {/* Grace-period warning banner */}
          {isInGracePeriod && gracePeriodExpiry && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <span className="text-red-500 text-lg leading-none mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  WARNING: This item is scheduled for deletion
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Deletes in{" "}
                  <CountdownTimer
                    targetDate={gracePeriodExpiry.toISOString()}
                    className="font-bold"
                  />
                  {" "}— Please finalize any transactions or contact the seller immediately.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.shippable && <Badge type="ship" label={t("badge_ship")} />}
                {item.listingType === "RENT" && <Badge type="rent" label={t("badge_rent")} />}
                {item.condition === "LIKE_NEW" && <Badge type="new" label={t("badge_new")} />}
                <span className="badge" style={{ background: "#f7f6f3", border: "1px solid #e5e3de", color: "#555" }}>
                  {t("condition_label")}: {conditionMap[item.condition]}
                </span>
              </div>
              <h2 className="text-xl font-bold">{item.title}</h2>
            </div>
            <button onClick={onClose} className="text-[#9a9590] hover:text-[#111] text-xl leading-none ml-4">
              ✕
            </button>
          </div>

          <p className="text-2xl font-bold mt-2" style={{ color: priceColor }}>
            {priceDisplay}
          </p>

          <p className="text-sm text-[#9a9590] mt-3 leading-relaxed">{item.description}</p>

          {/* Seller info */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#e5e3de]">
            <a
              href={`/user/${item.seller.id}`}
              className="flex items-center gap-2 flex-1 min-w-0 group"
            >
              <div className="w-8 h-8 bg-[#e5e3de] rounded-full flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-[#e8500a]/40 transition">
                {item.seller.image ? (
                  <img src={item.seller.image} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <svg className="w-4 h-4 text-[#9a9590]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold group-hover:text-[#e8500a] transition truncate">
                  {item.seller.name}
                </p>
                <p className="text-xs text-[#9a9590]">📍 {item.location}</p>
              </div>
            </a>
            <div className="ml-auto text-sm flex-shrink-0">
              {item.rating > 0 ? (
                <>
                  <StarRating rating={item.rating} />
                  <span className="text-[#9a9590] ml-1">{item.rating}.0</span>
                </>
              ) : (
                <span className="text-[#9a9590]">{t("no_review")}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            {user?.role === "ADMIN" ? (
              /* ── Admin View badge — replaces all buyer interaction buttons ── */
              <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#f0ede7] border border-[#e5e3de]">
                <svg className="w-4 h-4 text-[#9a9590] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-xs font-semibold text-[#9a9590] tracking-wide">โหมดมุมมองผู้ดูแลระบบ</span>
              </div>
            ) : (
              /* ── Normal buyer actions ── */
              <>
                <WishlistButton
                  itemId={item.id}
                  size="md"
                  className="w-11 h-11 border border-[#e5e3de] rounded-xl flex items-center justify-center hover:bg-[#f7f6f3] transition flex-shrink-0"
                />
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      showToast("⚠️ กรุณาเข้าสู่ระบบก่อนแชท");
                      return;
                    }
                    if (onChatClick && item) {
                      onClose();
                      onChatClick(item);
                    }
                  }}
                  className="flex-1 bg-[#111] text-white font-semibold py-3 rounded-xl hover:bg-[#333] transition text-sm"
                >
                  {t("chat_seller")}
                </button>

                {/* Buy Now — only for SELL items the current user doesn't own */}
                {item.listingType === "SELL" &&
                  item.status === "APPROVED" &&
                  isAuthenticated &&
                  user?.id !== item.seller.id && (
                  <button
                    onClick={() => {
                      onClose();
                      setCheckoutOpen(true);
                    }}
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition text-sm"
                  >
                    🛒 ซื้อเลย
                  </button>
                )}
              </>
            )}
          </div>

          {/* Meta info */}
          <div className="mt-5 pt-4 border-t border-[#e5e3de]">
            <p className="text-xs font-semibold text-[#9a9590] uppercase tracking-wider mb-2">{t("more_info")}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-[#9a9590]">{t("category_label")}</div>
              <div className="font-medium">{item.category.slug}</div>
              <div className="text-[#9a9590]">{t("condition_label")}</div>
              <div className="font-medium">{conditionMap[item.condition]}</div>
              <div className="text-[#9a9590]">{t("seller_label")}</div>
              <div className="font-medium">{item.seller.name}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    {/* CheckoutWizard lives OUTSIDE the detail Modal so its backdrop never stacks */}
    {checkoutOpen && (
      <CheckoutWizard
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        item={{
          id: item.id,
          title: item.title,
          price: item.price,
          emoji: item.emoji,
          allowShipping: item.allowShipping ?? true,
          allowMeetup: item.allowMeetup ?? true,
          allowCOD: item.allowCOD ?? true,
          seller: item.seller,
          images: item.images,
        }}
      />
    )}
    </>
  );
}
