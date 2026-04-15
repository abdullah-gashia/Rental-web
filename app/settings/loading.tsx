export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* Top bar skeleton */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e3de] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="w-28 h-5 bg-[#e5e3de] rounded animate-pulse" />
          <div className="w-px h-5 bg-[#e5e3de]" />
          <div className="w-20 h-5 bg-[#e5e3de] rounded animate-pulse" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6">
          {/* Side nav skeleton */}
          <div className="hidden md:block w-56 flex-shrink-0 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 bg-white rounded-xl animate-pulse" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="flex-1 bg-white rounded-2xl border border-[#e5e3de] p-6 space-y-4">
            <div className="w-48 h-6 bg-[#e5e3de] rounded animate-pulse" />
            <div className="w-full h-20 bg-[#f0ede7] rounded-xl animate-pulse" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="w-24 h-4 bg-[#e5e3de] rounded animate-pulse" />
                  <div className="w-full h-10 bg-[#f0ede7] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
