// Skeleton loading UI — shown by Next.js while the Server Component fetches data
import React from "react";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[#e5e3de]/60 ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#e5e3de] p-5 shadow-sm"
      style={{ minHeight: height }}
    >
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="w-full" style={{ height: height - 60 }} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e5e3de]">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="divide-y divide-[#f0ede7]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4 gap-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3"><ChartSkeleton height={340} /></div>
        <div className="lg:col-span-2"><ChartSkeleton height={340} /></div>
      </div>

      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
