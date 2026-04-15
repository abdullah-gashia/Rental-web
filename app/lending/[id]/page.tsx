import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLendingItemDetail } from "@/lib/actions/lending-items";
import { LENDING_CATEGORY_LABELS, LENDING_CATEGORY_EMOJI, CONDITION_LABELS, RENTAL_TYPE_LABELS } from "@/lib/constants/lending";
import BorrowModal from "./_components/BorrowModal";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LendingItemDetailPage({ params }: Props) {
  const { id } = await params;
  const [item, session] = await Promise.all([
    getLendingItemDetail(id),
    auth(),
  ]);

  if (!item) notFound();

  const user = session?.user as any;
  const isOwner = user?.id === item.owner.id;

  // Fetch wallet balance for cost calculation
  let walletBalance = 0;
  if (user?.id) {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
    walletBalance = u?.walletBalance ?? 0;
  }

  const emoji = LENDING_CATEGORY_EMOJI[item.category] ?? "📦";

  function renderPriceLabel() {
    if (item!.rentalType === "FREE") return "ให้ยืมฟรี";
    if (item!.rentalType === "DAILY_RATE") return `฿${(item!.dailyRate ?? 0).toLocaleString()} / วัน`;
    return `฿${(item!.flatFee ?? 0).toLocaleString()} (เหมา)`;
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-5xl mx-auto px-5 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#aaa] mb-5">
          <Link href="/" className="hover:text-[#555]">หน้าแรก</Link>
          <span>/</span>
          <Link href="/lending" className="hover:text-[#555]">ระบบปล่อยเช่า</Link>
          <span>/</span>
          <span className="text-[#555] font-medium truncate max-w-[180px]">{item.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
          {/* ── LEFT: Images + Details ── */}
          <div className="space-y-5">
            {/* Main image gallery */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden">
              {item.images.length > 0 ? (
                <div className="relative aspect-[16/10]">
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              ) : (
                <div className="aspect-[16/10] flex items-center justify-center text-7xl bg-[#f0ede7]">
                  {emoji}
                </div>
              )}

              {/* Thumbnail strip */}
              {item.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {item.images.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-[#e5e3de]">
                      <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
                <h3 className="text-sm font-bold text-[#111] mb-3">รายละเอียด</h3>
                <p className="text-sm text-[#555] whitespace-pre-line leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-white border border-[#e5e3de] text-xs text-[#555] rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Lending rules */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-sm font-bold text-[#111] mb-3">เงื่อนไขการยืม</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#faf9f7] rounded-xl p-3">
                  <p className="text-[11px] text-[#999] mb-0.5">ระยะเวลายืม</p>
                  <p className="font-semibold text-[#111]">{item.minLendingDays}–{item.maxLendingDays} วัน</p>
                </div>
                <div className="bg-[#faf9f7] rounded-xl p-3">
                  <p className="text-[11px] text-[#999] mb-0.5">ค่าปรับล่าช้า</p>
                  <p className="font-semibold text-[#111]">
                    {item.lateFeePerDay > 0 ? `฿${item.lateFeePerDay}/วัน` : "ไม่มี"}
                  </p>
                </div>
                <div className="bg-[#faf9f7] rounded-xl p-3">
                  <p className="text-[11px] text-[#999] mb-0.5">การต่ออายุ</p>
                  <p className="font-semibold text-[#111]">
                    {item.isRenewable ? `ต่อได้ ${item.maxRenewals} ครั้ง` : "ต่อไม่ได้"}
                  </p>
                </div>
                <div className="bg-[#faf9f7] rounded-xl p-3">
                  <p className="text-[11px] text-[#999] mb-0.5">สถานที่นัดรับ</p>
                  <p className="font-semibold text-[#111] text-xs line-clamp-2">
                    {item.meetupLocations.length > 0
                      ? item.meetupLocations.slice(0, 2).join(", ")
                      : "ตามตกลง"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Action Panel ── */}
          <div className="space-y-4">
            {/* Price card */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-base">{emoji}</span>
                <span className="text-xs text-[#999]">{LENDING_CATEGORY_LABELS[item.category]}</span>
              </div>

              <h1 className="text-xl font-bold text-[#111] mb-2">{item.title}</h1>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-extrabold text-[#e8500a]">{renderPriceLabel()}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#777] mb-4">
                <span className="px-2 py-0.5 bg-[#f0ede7] rounded-full">{CONDITION_LABELS[item.condition]}</span>
                <span>·</span>
                <span>ยืมไปแล้ว {item.totalLentCount} ครั้ง</span>
              </div>

              {item.depositAmount > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 mb-4 text-sm">
                  <p className="font-semibold text-orange-700">มัดจำ ฿{item.depositAmount.toLocaleString()}</p>
                  <p className="text-xs text-orange-600 mt-0.5">จะถูกคืนหลังส่งมอบสำเร็จ (หักค่าเสียหายถ้ามี)</p>
                </div>
              )}

              {/* Status */}
              {item.status !== "AVAILABLE" && (
                <div className="bg-gray-100 text-gray-600 rounded-xl px-3 py-2.5 text-sm font-medium text-center mb-4">
                  {item.status === "LENT_OUT" ? "🔴 กำลังถูกยืมอยู่" :
                   item.status === "RESERVED" ? "🟡 มีคนจองแล้ว" :
                   "⚫ ปิดการยืมชั่วคราว"}
                </div>
              )}

              {/* Action button */}
              {!isOwner && (
                <BorrowModal
                  item={item}
                  isAuthenticated={!!user}
                  walletBalance={walletBalance}
                />
              )}

              {isOwner && (
                <div className="space-y-2">
                  <div className="text-center text-sm text-[#777] py-2">
                    นี่คือรายการของคุณ
                  </div>
                  <Link
                    href="/lending/my-items"
                    className="block w-full text-center py-3 border border-[#e5e3de] text-sm font-medium
                               text-[#555] rounded-xl hover:bg-[#f0ede7] transition"
                  >
                    จัดการรายการ
                  </Link>
                </div>
              )}
            </div>

            {/* Owner card */}
            <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
              <h3 className="text-xs font-bold text-[#999] uppercase tracking-wide mb-3">เจ้าของ</h3>
              <div className="flex items-center gap-3">
                {item.owner.image ? (
                  <Image src={item.owner.image} alt="" width={44} height={44}
                    className="rounded-full border border-[#e5e3de]" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d]
                                  flex items-center justify-center text-white font-bold text-sm">
                    {(item.owner.name ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-[#111]">{item.owner.name ?? "ผู้ใช้"}</p>
                    {item.owner.verificationStatus === "APPROVED" && (
                      <span className="text-xs" title="KYC ยืนยันแล้ว">✅</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#999]">
                    <span>
                      {item.owner.lendingTier === "TRUSTED" ? "⭐ น่าเชื่อถือ" :
                       item.owner.lendingTier === "STANDARD" ? "✔ มาตรฐาน" : "🆕 ผู้ใช้ใหม่"}
                    </span>
                    {item.owner.lenderRating && (
                      <>
                        <span>·</span>
                        <span>⭐ {item.owner.lenderRating.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Safety notice */}
            <div className="bg-[#faf9f7] border border-[#e5e3de] rounded-2xl p-4 text-xs text-[#777] space-y-1.5">
              <p className="font-semibold text-[#555]">🔒 ระบบความปลอดภัย</p>
              <p>• มัดจำถูกกักไว้จนกว่าของจะถูกคืน</p>
              <p>• ถ่ายรูปสภาพของก่อน-หลังยืม (Digital Handshake)</p>
              <p>• มีระบบข้อพิพาทหากเกิดปัญหา</p>
              <p>• ผู้ใช้ทุกคนผ่าน KYC แล้ว</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
