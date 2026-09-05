"use client";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-base font-semibold text-[#0f1e35]">โหลดข้อมูลคำสั่งซื้อไม่สำเร็จ</h2>
      <p className="text-sm text-[#5b6b82]">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-semibold bg-[#2563eb] text-white rounded-xl hover:bg-[#1d4ed8] transition"
      >
        ลองใหม่
      </button>
    </div>
  );
}
