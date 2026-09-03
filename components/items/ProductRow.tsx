"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";
import type { ItemWithDetails } from "@/lib/types";

interface ProductRowProps {
  item: ItemWithDetails;
  onClick?: () => void;
}

/**
 * Dense list row: square thumbnail, title, one line of metadata,
 * price tag on the right. The unit inside every panel.
 */
export default function ProductRow({ item, onClick }: ProductRowProps) {
  const { t, locale } = useLocaleStore();

  const isRent     = item.listingType === "RENT";
  const rentAmount = item.rentalRate ?? item.dailyRate ?? 0;
  const rateSuffix =
    item.rentalRateType === "MONTHLY" ? t("per_month") :
    item.rentalRateType === "YEARLY"  ? t("per_year")  :
    t("per_day");
  const priceLabel = isRent
    ? `฿${rentAmount.toLocaleString()}${rateSuffix}`
    : `฿${item.price.toLocaleString()}`;

  const categoryName = locale === "th" ? item.category.nameTh : item.category.nameEn;
  const meta = [categoryName, item.location].filter(Boolean).join(" · ");

  return (
    <button type="button" className="hp-row group" onClick={onClick}>
      <div className="hp-row-thumb">
        {item.images.length > 0 ? (
          <img src={item.images[0].url} alt={item.title} loading="lazy" decoding="async" />
        ) : (
          <div className="hp-thumb-fallback w-full h-full flex items-center justify-center">
            {item.emoji || "📦"}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[var(--hp-ink)] truncate group-hover:text-[var(--psu-indigo)] transition-colors">
          {item.title}
        </p>
        <p className="text-[12.5px] text-[var(--hp-muted)] truncate mt-0.5">{meta}</p>
      </div>

      <span className={`hp-tag ${isRent ? "hp-tag-rent" : ""}`}>{priceLabel}</span>
    </button>
  );
}
