// Server Component — no interactivity needed; receives pre-formatted values.

interface KpiCardProps {
  label:    string;
  value:    string;
  icon:     React.ReactNode;
  /** Tailwind bg + text classes for the icon badge, e.g. "bg-blue-100 text-blue-600" */
  accent:   string;
  sublabel?: string;
}

export default function KpiCard({ label, value, icon, accent, sublabel }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row: label + icon badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-[#777] leading-snug">{label}</span>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-extrabold text-[#111] tracking-tight tabular-nums">
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-[#9a9590] mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
