export default function OrdersLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-36 bg-[#e5e3de] rounded-lg" />
      <div className="flex gap-3">
        <div className="h-9 w-64 bg-[#e5e3de] rounded-xl" />
        <div className="h-9 w-36 bg-[#e5e3de] rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden">
        <div className="border-b border-[#e5e3de] bg-[#faf9f7] px-4 py-3 flex gap-4">
          {[32, 80, 200, 120, 120, 80, 90, 100, 80].map((w, i) => (
            <div key={i} className="h-4 bg-[#e5e3de] rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-[#f0ede7]">
            <div className="w-3.5 h-3.5 bg-[#e5e3de] rounded" />
            <div className="h-4 w-20 bg-[#e5e3de] rounded" />
            <div className="flex items-center gap-2.5 w-[200px]">
              <div className="w-8 h-8 rounded-lg bg-[#e5e3de] flex-shrink-0" />
              <div className="h-3 w-28 bg-[#e5e3de] rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-[#e5e3de] rounded" />
              <div className="h-2.5 w-28 bg-[#ebe9e4] rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-[#e5e3de] rounded" />
              <div className="h-2.5 w-28 bg-[#ebe9e4] rounded" />
            </div>
            <div className="h-4 w-16 bg-[#e5e3de] rounded ml-auto" />
            <div className="h-5 w-20 bg-[#e5e3de] rounded-full" />
            <div className="h-4 w-20 bg-[#e5e3de] rounded" />
            <div className="h-7 w-7 bg-[#e5e3de] rounded-lg" />
          </div>
        ))}
      </div>
      <div className="h-8 w-64 bg-[#e5e3de] rounded-xl" />
    </div>
  );
}
