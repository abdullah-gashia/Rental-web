"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToastStore } from "@/lib/stores/toast-store";
import type { ItemWithDetails } from "@/lib/types";
import StarRating from "@/components/ui/StarRating";
import WishlistButton from "@/components/ui/WishlistButton";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import CountdownTimer from "@/components/ui/CountdownTimer";

const GRACE_MS = 24 * 60 * 60 * 1000;

interface ProductDetailProps {
  item: ItemWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onChatClick?: (item: ItemWithDetails) => void;
}

export default function ProductDetail({ item, isOpen, onClose, onChatClick }: ProductDetailProps) {
  const t = useLocaleStore((s) => s.t);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showToast = useToastStore((s) => s.show);

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
    <Modal isOpen={isOpen} onClose={onClose} wide>
      <div className="flex">
        {/* Image panel */}
        <div className="hidden md:flex w-64 flex-shrink-0 bg-[#f7f6f3] rounded-l-2xl p-6 flex-col gap-3">
          <div
            className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: item.color || "#e5e3de" }}
          >
            {item.images.length > 0 ? (
              <img src={item.images[0].url} className="w-full h-full object-cover rounded-xl" alt={item.title} />
            ) : (
              <span className="text-[80px]">{item.emoji || "📦"}</span>
            )}
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-12 h-12 bg-[#e5e3de] rounded-lg opacity-40" />
            ))}
          </div>
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
            <div className="w-8 h-8 bg-[#e5e3de] rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-[#9a9590]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">{item.seller.name}</p>
              <p className="text-xs text-[#9a9590]">📍 {item.location}</p>
            </div>
            <div className="ml-auto text-sm">
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
  );
}
