"use client";

export default function ItemsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-base font-semibold text-[#111]">โหลดข้อมูลสินค้าไม่สำเร็จ</h2>
      <p className="text-sm text-[#777]">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-semibold bg-[#e8500a] text-white rounded-xl hover:bg-[#c94208] transition"
      >
        ลองใหม่
      </button>
    </div>
  );
}
