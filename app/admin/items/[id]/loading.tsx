export default function ItemDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-40 bg-[#e5e3de] rounded" />

      {/* Breadcrumb skeleton */}
      <div className="h-3 w-56 bg-[#ebe9e4] rounded" />

      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-7 w-48 bg-[#e5e3de] rounded-lg" />
        <div className="h-6 w-20 bg-[#e5e3de] rounded-full" />
      </div>
      <div className="h-4 w-72 bg-[#ebe9e4] rounded" />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-5">
        {/* Right column */}
        <div className="space-y-5 md:order-2">
          {/* Item Details Card */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6 space-y-4">
            <div className="h-4 w-28 bg-[#e5e3de] rounded" />
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-16 bg-[#ebe9e4] rounded" />
                <div className="h-3 w-24 bg-[#e5e3de] rounded" />
              </div>
            ))}
            <div className="border-t border-[#f0ede7] pt-3">
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 bg-[#ebe9e4] rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* System Metadata Card */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6 space-y-3">
            <div className="h-4 w-24 bg-[#e5e3de] rounded" />
            {[1,2,3,4].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-20 bg-[#ebe9e4] rounded" />
                <div className="h-3 w-32 bg-[#e5e3de] rounded" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-[#faf9f7] rounded-xl" />
              ))}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6 space-y-3">
            <div className="h-4 w-20 bg-[#e5e3de] rounded" />
            <div className="h-10 bg-[#ebe9e4] rounded-xl" />
            <div className="h-10 bg-[#ebe9e4] rounded-xl" />
            <div className="h-10 bg-[#ebe9e4] rounded-xl" />
          </div>
        </div>

        {/* Left column */}
        <div className="space-y-5 md:order-1">
          {/* Image Gallery */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
            <div className="h-4 w-16 bg-[#e5e3de] rounded mb-3" />
            <div className="aspect-[4/3] bg-[#f0ede7] rounded-xl" />
            <div className="flex gap-2 mt-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-16 h-16 bg-[#ebe9e4] rounded-lg" />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
            <div className="h-4 w-20 bg-[#e5e3de] rounded mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-[#ebe9e4] rounded" />
              <div className="h-3 w-4/5 bg-[#ebe9e4] rounded" />
              <div className="h-3 w-3/5 bg-[#ebe9e4] rounded" />
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
            <div className="h-4 w-32 bg-[#e5e3de] rounded mb-4" />
            <div className="h-20 bg-[#faf9f7] rounded-xl" />
          </div>

          {/* Seller Card */}
          <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
            <div className="h-4 w-16 bg-[#e5e3de] rounded mb-4" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#ebe9e4]" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-[#e5e3de] rounded" />
                <div className="h-3 w-48 bg-[#ebe9e4] rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-[#faf9f7] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
