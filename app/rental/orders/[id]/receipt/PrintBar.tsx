"use client";

interface Props {
  title: string;
}

export default function PrintBar({ title }: Props) {
  return (
    <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-3
                    flex items-center justify-between z-50 shadow-sm print:hidden">
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-[#e8500a] text-white text-sm font-semibold rounded-lg
                     hover:bg-[#c94208] transition"
        >
          🖨️ พิมพ์ / บันทึก PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
