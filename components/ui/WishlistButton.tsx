"use client";

import { useWishlistStore } from "@/lib/stores/wishlist-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useLocaleStore } from "@/lib/stores/locale-store";
import { useAuthStore } from "@/lib/stores/auth-store";

interface WishlistButtonProps {
  itemId: string;
  size?: "sm" | "md";
  className?: string;
}

export default function WishlistButton({
  itemId,
  size = "sm",
  className = "",
}: WishlistButtonProps) {
  const has = useWishlistStore((s) => s.has);
  const toggle = useWishlistStore((s) => s.toggle);
  const showToast = useToastStore((s) => s.show);
  const t = useLocaleStore((s) => s.t);
  const userRole = useAuthStore((s) => s.user?.role);

  const isWished = has(itemId);

  // Admins are moderators — they don't save to wishlist
  if (userRole === "ADMIN") return null;
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggle(itemId);
    showToast(added ? t("wishlist_added") : t("wishlist_removed"));
  };

  return (
    <button onClick={handleClick} className={className}>
      <svg
        className={iconSize}
        style={{ color: isWished ? "#ef4444" : "#9a9590" }}
        fill={isWished ? "#ef4444" : "none"}
        stroke={isWished ? "#ef4444" : "currentColor"}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
