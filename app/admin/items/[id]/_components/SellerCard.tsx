import Image from "next/image";
import Link from "next/link";
import StatusBadge from "../../../_components/StatusBadge";
import { formatThaiDate, formatNumber } from "../../../_lib/utils";

// Verification display mapping
const VERIFICATION_TH: Record<string, { label: string; color: string }> = {
  UNVERIFIED: { label: "ยังไม่ยืนยัน",  color: "text-gray-500" },
  PENDING:    { label: "รอตรวจสอบ",     color: "text-yellow-600" },
  APPROVED:   { label: "ยืนยันแล้ว",    color: "text-green-600" },
  REJECTED:   { label: "ถูกปฏิเสธ",     color: "text-red-600" },
  SUSPENDED:  { label: "ถูกระงับ",      color: "text-red-600" },
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

export default function SellerCard({ seller }: Props) {
  const verification = VERIFICATION_TH[seller.verificationStatus] ?? {
    label: seller.verificationStatus, color: "text-gray-500",
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
      <h3 className="text-sm font-semibold text-[#555] mb-4">ผู้ขาย</h3>

      {/* Warnings */}
      {seller.isBanned && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-medium">ผู้ขายรายนี้ถูกแบน</span>
        </div>
      )}
      {(seller.verificationStatus === "UNVERIFIED" || seller.verificationStatus === "REJECTED") && !seller.isBanned && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-700 flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-medium">
            {seller.verificationStatus === "UNVERIFIED"
              ? "ผู้ขายยังไม่ได้ยืนยันตัวตน"
              : "การยืนยันตัวตนถูกปฏิเสธ"}
          </span>
        </div>
      )}

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-4">
        {seller.image ? (
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[#f0ede7]">
            <Image
              src={seller.image}
              alt={seller.name ?? "ผู้ขาย"}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#f0ede7] flex items-center justify-center text-xl flex-shrink-0">
            👤
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[#111] truncate">
            {seller.name ?? "ไม่ระบุชื่อ"}
          </p>
          <p className="text-xs text-[#888] truncate">{seller.email}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#faf9f7] rounded-xl p-3 text-center">
          <p className="text-xs text-[#888]">ยืนยันตัวตน</p>
          <p className={`text-xs font-semibold mt-0.5 ${verification.color}`}>
            {seller.verificationStatus === "APPROVED" ? "✅ " : ""}
            {verification.label}
          </p>
        </div>
        <div className="bg-[#faf9f7] rounded-xl p-3 text-center">
          <p className="text-xs text-[#888]">คะแนน</p>
          <p className="text-sm font-semibold text-[#333] mt-0.5">
            {seller.trustScore}/100
          </p>
        </div>
        <div className="bg-[#faf9f7] rounded-xl p-3 text-center">
          <p className="text-xs text-[#888]">ขายแล้ว</p>
          <p className="text-sm font-semibold text-[#333] mt-0.5">
            {formatNumber(seller.completedSalesCount)} ชิ้น
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[#888]">สถานะบัญชี</span>
          {seller.isBanned ? (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border-red-200">
              ถูกแบน
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border-green-200">
              ปกติ
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888]">บทบาท</span>
          <StatusBadge status={seller.role} type="role" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888]">สินค้าทั้งหมด</span>
          <span className="text-[#333]">{formatNumber(seller.itemCount)} ชิ้น</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888]">สมัครเมื่อ</span>
          <span className="text-[#333]">{formatThaiDate(seller.createdAt)}</span>
        </div>
      </div>

      {/* Link to seller profile */}
      <Link
        href={`/admin/users?search=${encodeURIComponent(seller.email)}`}
        className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#e8500a] hover:text-[#c94208] bg-[#fdf4ef] hover:bg-[#fce8da] rounded-xl py-2.5 transition-colors"
      >
        ดูโปรไฟล์ผู้ขาย →
      </Link>
    </div>
  );
}
