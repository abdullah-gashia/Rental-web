import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getMyLendingItems } from "@/lib/actions/lending-items";
import { LENDING_CATEGORY_LABELS, LENDING_CATEGORY_EMOJI, RENTAL_TYPE_LABELS, CONDITION_LABELS } from "@/lib/constants/lending";
import MyItemActions from "./_components/MyItemActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายการให้ยืมของฉัน | PSU Store" };

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "พร้อมให้ยืม",
  LENT_OUT: "กำลังถูกยืม",
  RESERVED: "มีคนจองแล้ว",
  UNAVAILABLE: "ปิดการยืม",
  SUSPENDED: "ถูกระงับ",
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  LENT_OUT: "bg-blue-50 text-blue-700 border-blue-200",
  RESERVED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  UNAVAILABLE: "bg-gray-50 text-gray-600 border-gray-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
};

export default async function MyLendingItemsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) redirect("/auth/signin");

  const items = await getMyLendingItems();

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-4xl mx-auto px-5 py-6">
        <nav className="flex items-center gap-1.5 text-xs text-[#aaa] mb-5">
          <Link href="/lending" className="hover:text-[#555]">ระบบปล่อยเช่า</Link>
          <span>/</span>
          <span className="text-[#555] font-medium">รายการของฉัน</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-[#111]">📋 รายการให้ยืมของฉัน</h1>
            <p className="text-sm text-[#777] mt-0.5">{items.length} รายการ</p>
          </div>
          <Link
            href="/lending/post"
            className="px-4 py-2 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                       hover:bg-[#c94208] transition"
          >
            + เพิ่มรายการ
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-12 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-[#555] font-medium">ยังไม่มีรายการให้ยืม</p>
            <p className="text-sm text-[#aaa] mt-1 mb-5">แบ่งปันของที่คุณมีให้เพื่อนนักศึกษายืมใช้</p>
            <Link
              href="/lending/post"
              className="inline-block px-5 py-2.5 bg-[#e8500a] text-white text-sm font-bold
                         rounded-xl hover:bg-[#c94208] transition"
            >
              ลงรายการแรก
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#e5e3de] p-4 flex items-center gap-4">
                {/* Image */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#f0ede7]">
                  {item.images[0] ? (
                    <Image src={item.images[0]} alt="" fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                      {LENDING_CATEGORY_EMOJI[item.category]}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link
                      href={`/lending/${item.id}`}
                      className="text-sm font-semibold text-[#111] hover:text-[#e8500a] truncate transition"
                    >
                      {item.title}
                    </Link>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLORS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="text-xs text-[#999]">
                    {LENDING_CATEGORY_EMOJI[item.category]} {LENDING_CATEGORY_LABELS[item.category]}
                    {" · "}{CONDITION_LABELS[item.condition]}
                    {" · "}{RENTAL_TYPE_LABELS[item.rentalType]}
                    {item.rentalType === "DAILY_RATE" && ` ฿${(item.dailyRate ?? 0).toLocaleString()}/วัน`}
                    {item.rentalType === "FLAT_FEE" && ` ฿${(item.flatFee ?? 0).toLocaleString()} เหมา`}
                  </p>
                  <p className="text-xs text-[#bbb] mt-0.5">
                    ยืมไปแล้ว {item.totalLentCount} ครั้ง · มัดจำ ฿{item.depositAmount.toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <MyItemActions itemId={item.id} status={item.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
