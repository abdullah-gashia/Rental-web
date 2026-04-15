import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminItemDetail } from "./actions";
import StatusBadge from "../../_components/StatusBadge";
import { formatThaiDate } from "../../_lib/utils";

// Components
import ImageGallery       from "./_components/ImageGallery";
import ItemDetailsCard    from "./_components/ItemDetailsCard";
import SystemMetadataCard from "./_components/SystemMetadataCard";
import SellerCard         from "./_components/SellerCard";
import OrderHistoryTable  from "./_components/OrderHistoryTable";
import AuditLogTimeline   from "./_components/AuditLogTimeline";
import AdminActionPanel   from "./_components/AdminActionPanel";
import DescriptionSection from "./_components/DescriptionSection";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminItemDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getAdminItemDetail(id);

  if (!item) notFound();

  // Condition display mapping
  const CONDITION_TH: Record<string, string> = {
    LIKE_NEW:     "สภาพเหมือนใหม่",
    GOOD:         "สภาพดี",
    FAIR:         "สภาพพอใช้",
    NEEDS_REPAIR: "ต้องซ่อม",
  };

  return (
    <div className="space-y-5">
      {/* Removed banner */}
      {item.status === "REMOVED" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5 flex items-center gap-3 text-red-700">
          <span className="text-xl">🗑️</span>
          <div>
            <p className="font-semibold text-sm">สินค้านี้ถูกลบแล้ว</p>
            {item.rejectReason && (
              <p className="text-xs mt-0.5">เหตุผล: {item.rejectReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/admin/items"
        className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-[#555] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        กลับไปรายการสินค้า
      </Link>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[#aaa] flex-wrap">
        <Link href="/admin/dashboard" className="hover:text-[#555] transition-colors">
          Admin Panel
        </Link>
        <span>/</span>
        <Link href="/admin/items" className="hover:text-[#555] transition-colors">
          สินค้า
        </Link>
        <span>/</span>
        <span className="text-[#555] font-medium truncate max-w-[200px]">{item.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#111]">{item.title}</h1>
            <StatusBadge status={item.status} type="item" />
          </div>
          <p className="text-sm text-[#888] mt-1">
            {item.category.emoji && <span className="mr-1">{item.category.emoji}</span>}
            {item.category.nameTh}
            {" · "}
            {CONDITION_TH[item.condition] || item.condition}
            {" · "}
            {item.listingType === "SELL" ? "ขาย" : "เช่า"}
            {" · "}
            โพสต์เมื่อ {formatThaiDate(item.createdAt)}
          </p>
        </div>
      </div>

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5">
        {/* ── RIGHT COLUMN (on top for mobile) ── */}
        <div className="space-y-5 md:order-2">
          <ItemDetailsCard item={item} />
          <SystemMetadataCard item={item} />
          <AdminActionPanel item={{ id: item.id, title: item.title, status: item.status, trending: item.trending }} />
        </div>

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5 md:order-1">
          <ImageGallery images={item.images} />
          <DescriptionSection description={item.description} />
          <OrderHistoryTable orders={item.orders} />
          <SellerCard seller={item.seller} />
          <AuditLogTimeline auditLog={item.auditLog} itemCreatedAt={item.createdAt} />
        </div>
      </div>
    </div>
  );
}
