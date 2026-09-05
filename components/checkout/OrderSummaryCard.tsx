"use client";

interface OrderSummaryCardProps {
  title: string;
  price: number;
  sellerName: string | null;
  imageUrl?: string;
  emoji?: string | null;
}

export default function OrderSummaryCard({
  title,
  price,
  sellerName,
  imageUrl,
  emoji,
}: OrderSummaryCardProps) {
  return (
    <div className="flex items-center gap-3 bg-[var(--c-canvas)] rounded-xl px-4 py-3 mb-5 border border-[var(--c-line)]">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#e8e5df] flex-shrink-0 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
        ) : (
          <span className="text-xl">{emoji ?? "📦"}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--c-ink)] truncate">{title}</p>
        <p className="text-xs text-[var(--c-muted)]">
          ขายโดย: {sellerName ?? "ไม่ระบุชื่อ"}
        </p>
      </div>

      {/* Price */}
      <p className="text-sm font-extrabold text-[var(--c-ink)] flex-shrink-0">
        ฿{price.toLocaleString()}
      </p>
    </div>
  );
}
