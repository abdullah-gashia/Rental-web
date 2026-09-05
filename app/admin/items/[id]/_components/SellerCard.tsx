import { getTr } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import StatusBadge from "../../../_components/StatusBadge";
import { formatThaiDate, formatNumber } from "../../../_lib/utils";

// Verification display mapping
const VERIFICATION_TH: Record<string, { label: string; color: string }> = {
  UNVERIFIED: { label: "ยังไม่ยืนยัน",  color: "text-[var(--c-muted)]" },
  PENDING:    { label: "รอตรวจสอบ",     color: "text-[var(--c-warn)]" },
  APPROVED:   { label: "ยืนยันแล้ว",    color: "text-[var(--c-ok)]" },
  REJECTED:   { label: "ถูกปฏิเสธ",     color: "text-[var(--c-danger)]" },
  SUSPENDED:  { label: "ถูกระงับ",      color: "text-[var(--c-danger)]" },
};

interface Props {
  seller: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    isBanned: boolean;
    verificationStatus: string;
    psuIdType: string | null;
    trustScore: number;
    itemCount: number;
    completedSalesCount: number;
    createdAt: string;
  };
}

export default async function SellerCard({ seller }: Props) {
  const tr = await getTr();
  const verification = VERIFICATION_TH[seller.verificationStatus] ?? {
    label: seller.verificationStatus, color: "text-[var(--c-muted)]",
  };

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6">
      <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-4">{tr("ผู้ขาย")}</h3>

      {/* Warnings */}
      {seller.isBanned && (
        <div className="mb-4 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-3 py-2.5 text-sm text-[var(--c-danger)] flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-medium">{tr("ผู้ขายรายนี้ถูกแบน")}</span>
        </div>
      )}
      {(seller.verificationStatus === "UNVERIFIED" || seller.verificationStatus === "REJECTED") && !seller.isBanned && (
        <div className="mb-4 bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-3 py-2.5 text-sm text-[var(--c-warn)] flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-medium">
            {seller.verificationStatus === "UNVERIFIED"
              ? tr("ผู้ขายยังไม่ได้ยืนยันตัวตน")
              : tr("การยืนยันตัวตนถูกปฏิเสธ")}
          </span>
        </div>
      )}

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-4">
        {seller.image ? (
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[var(--c-line-soft)]">
            <Image
              src={seller.image}
              alt={seller.name ?? tr("ผู้ขาย")}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--c-line-soft)] flex items-center justify-center text-xl flex-shrink-0">
            👤
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[var(--c-ink)] truncate">
            {seller.name ?? tr("ไม่ระบุชื่อ")}
          </p>
          <p className="text-xs text-[var(--c-faint)] truncate">{seller.email}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[var(--c-subtle)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--c-faint)]">{tr("ยืนยันตัวตน")}</p>
          <p className={`text-xs font-semibold mt-0.5 ${verification.color}`}>
            {seller.verificationStatus === "APPROVED" ? "✅ " : ""}
            {tr(verification.label)}
          </p>
        </div>
        <div className="bg-[var(--c-subtle)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--c-faint)]">{tr("คะแนน")}</p>
          <p className="text-sm font-semibold text-[var(--c-ink-1)] mt-0.5">
            {seller.trustScore}/100
          </p>
        </div>
        <div className="bg-[var(--c-subtle)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--c-faint)]">{tr("ขายแล้ว")}</p>
          <p className="text-sm font-semibold text-[var(--c-ink-1)] mt-0.5">{tr("{0} ชิ้น", [formatNumber(seller.completedSalesCount)])}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[var(--c-faint)]">{tr("สถานะบัญชี")}</span>
          {seller.isBanned ? (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--c-danger-soft)] text-[var(--c-danger)] border-[var(--c-danger-line)]">{tr("ถูกแบน")}</span>
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]">{tr("ปกติ")}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--c-faint)]">{tr("บทบาท")}</span>
          <StatusBadge status={seller.role} type="role" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--c-faint)]">{tr("สินค้าทั้งหมด")}</span>
          <span className="text-[var(--c-ink-1)]">{tr("{0} ชิ้น", [formatNumber(seller.itemCount)])}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--c-faint)]">{tr("สมัครเมื่อ")}</span>
          <span className="text-[var(--c-ink-1)]">{formatThaiDate(seller.createdAt)}</span>
        </div>
      </div>

      {/* Link to seller profile */}
      <Link
        href={`/admin/users?search=${encodeURIComponent(seller.email)}`}
        className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--c-accent)] hover:text-[var(--c-accent-str)] bg-[#fdf4ef] hover:bg-[#fce8da] rounded-xl py-2.5 transition-colors"
      >{tr("ดูโปรไฟล์ผู้ขาย →")}</Link>
    </div>
  );
}
