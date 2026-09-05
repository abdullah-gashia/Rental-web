import StatusBadge from "../../../_components/StatusBadge";
import { formatCurrency } from "../../../_lib/utils";

// Condition display mapping
const CONDITION_TH: Record<string, string> = {
  LIKE_NEW:     "สภาพเหมือนใหม่",
  GOOD:         "สภาพดี",
  FAIR:         "สภาพพอใช้",
  NEEDS_REPAIR: "ต้องซ่อม",
};

interface Props {
  item: {
    price: number;
    category: { nameTh: string; emoji: string | null };
    condition: string;
    status: string;
    listingType: string;
    negotiable: boolean;
    allowShipping: boolean;
    allowMeetup: boolean;
    allowCOD: boolean;
    location: string | null;
    shippingNote: string | null;
    rejectReason: string | null;
  };
}

export default function ItemDetailsCard({ item }: Props) {
  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6">
      <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-4">รายละเอียดสินค้า</h3>

      <div className="space-y-3.5">
        {/* Price */}
        <Row label="ราคา">
          <span className="text-lg font-bold text-[var(--c-accent)]">
            {formatCurrency(item.price)}
          </span>
          {item.negotiable && (
            <span className="ml-2 text-xs text-[var(--c-ink-3)] bg-[var(--c-canvas)] rounded-full px-2 py-0.5">
              ต่อรองได้
            </span>
          )}
        </Row>

        {/* Category */}
        <Row label="หมวดหมู่">
          <span className="text-[var(--c-ink-1)]">
            {item.category.emoji && <span className="mr-1">{item.category.emoji}</span>}
            {item.category.nameTh}
          </span>
        </Row>

        {/* Condition */}
        <Row label="สภาพ">
          <span className="text-[var(--c-ink-1)]">
            {CONDITION_TH[item.condition] || item.condition}
          </span>
        </Row>

        {/* Listing Type */}
        <Row label="ประเภท">
          <span className="text-[var(--c-ink-1)]">
            {item.listingType === "SELL" ? "ขาย" : "เช่า"}
          </span>
        </Row>

        {/* Status */}
        <Row label="สถานะ">
          <StatusBadge status={item.status} type="item" />
        </Row>

        {/* Rejection reason */}
        {item.rejectReason && (
          <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl p-3 text-sm">
            <span className="font-medium text-[var(--c-danger)]">เหตุผล:</span>
            <span className="text-[var(--c-danger)] ml-1">{item.rejectReason}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[var(--c-line-soft)] pt-3.5">
          <p className="text-xs font-semibold text-[var(--c-faint)] uppercase tracking-wider mb-3">
            การจัดส่งและชำระเงิน
          </p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <DeliveryChip label="จัดส่ง" enabled={item.allowShipping} />
            <DeliveryChip label="นัดรับ" enabled={item.allowMeetup} />
            <DeliveryChip label="COD" enabled={item.allowCOD} />
          </div>

          {/* Location */}
          {item.location && (
            <Row label="สถานที่">
              <span className="text-[var(--c-ink-1)]">📍 {item.location}</span>
            </Row>
          )}

          {/* Shipping note */}
          {item.shippingNote && (
            <Row label="หมายเหตุ">
              <span className="text-[var(--c-ink-2)] text-xs italic">{item.shippingNote}</span>
            </Row>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-[var(--c-faint)] flex-shrink-0">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  );
}

function DeliveryChip({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={`text-center text-xs py-1.5 rounded-lg border transition-colors ${
        enabled
          ? "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]"
          : "bg-[var(--c-subtle)] text-[var(--c-faint)] border-[var(--c-line)]"
      }`}
    >
      {enabled ? "✅" : "❌"} {label}
    </div>
  );
}
