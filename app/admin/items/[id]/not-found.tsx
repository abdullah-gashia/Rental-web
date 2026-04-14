import Link from "next/link";

export default function ItemNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">📦</div>
      <h2 className="text-xl font-bold text-[#111] mb-2">ไม่พบสินค้า</h2>
      <p className="text-sm text-[#888] mb-6 max-w-sm">
        สินค้าที่คุณกำลังค้นหาอาจถูกลบออกจากระบบหรือไม่เคยมีอยู่
      </p>
      <Link
        href="/admin/items"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e8500a] text-white rounded-xl text-sm font-semibold hover:bg-[#c94208] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        กลับไปรายการสินค้า
      </Link>
    </div>
  );
}
