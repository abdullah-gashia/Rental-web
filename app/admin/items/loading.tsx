export default function ItemsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-24 bg-[#e5e3de] rounded-lg" />
      <div className="flex gap-3">
        <div className="h-9 w-64 bg-[#e5e3de] rounded-xl" />
        <div className="h-9 w-32 bg-[#e5e3de] rounded-xl" />
        <div className="h-9 w-28 bg-[#e5e3de] rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-[#e5e3de] overflow-hidden">
        <div className="border-b border-[#e5e3de] bg-[#faf9f7] px-4 py-3 flex gap-4">
          {[280,120,80,60,80,100,80].map((w, i) => (
            <div key={i} className="h-4 bg-[#e5e3de] rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-[#f0ede7]">
            <div className="flex items-center gap-3 w-[280px]">
              <div className="w-10 h-10 rounded-lg bg-[#e5e3de] flex-shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 w-36 bg-[#e5e3de] rounded" />
                <div className="h-2.5 w-20 bg-[#ebe9e4] rounded" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-[#e5e3de] rounded" />
              <div className="h-2.5 w-32 bg-[#ebe9e4] rounded" />
            </div>
            <div className="h-4 w-16 bg-[#e5e3de] rounded ml-auto" />
            <div className="h-4 w-10 bg-[#e5e3de] rounded" />
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
