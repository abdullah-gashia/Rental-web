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
    <div className="flex items-center gap-3 bg-[#f7f6f3] rounded-xl px-4 py-3 mb-5 border border-[#e5e3de]">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#e8e5df] flex-shrink-0 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">{emoji ?? "📦"}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#111] truncate">{title}</p>
        <p className="text-xs text-[#9a9590]">
          ขายโดย: {sellerName ?? "ไม่ระบุชื่อ"}
        </p>
      </div>

      {/* Price */}
      <p className="text-sm font-extrabold text-[#111] flex-shrink-0">
        ฿{price.toLocaleString()}
      </p>
    </div>
  );
}
