"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface StatusPieChartProps {
  data: { status: string; count: number }[];
}

// Map Item status enum → Thai display name
const STATUS_TH: Record<string, string> = {
  APPROVED:    "อนุมัติแล้ว",
  PENDING:     "รออนุมัติ",
  ACTIVE:      "กำลังขาย",
  SOLD:        "ขายแล้ว",
  RENTED:      "ให้เช่าแล้ว",
  EXPIRED:     "หมดอายุ",
  REJECTED:    "ถูกปฏิเสธ",
  REMOVED:     "ถูกลบ",
  UNAVAILABLE: "ไม่พร้อม",
};

// Accessible, color-blind-safe palette (7 distinct hues)
const PALETTE = [
  "#e8500a", // orange-red  (PSU accent)
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#64748b", // slate
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { percent: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct  = ((item.payload.percent ?? 0) * 100).toFixed(1);
  return (
    <div className="bg-white border border-[#e5e3de] rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-[#333]">{STATUS_TH[item.name] ?? item.name}</p>
      <p className="text-[#555] mt-0.5">
        {item.value} รายการ{" "}
        <span className="text-[#9a9590]">({pct}%)</span>
      </p>
    </div>
  );
}

function legendFormatter(value: string) {
  return (
    <span style={{ fontSize: 12, color: "#555" }}>
      {STATUS_TH[value] ?? value}
    </span>
  );
}

export default function StatusPieChart({ data }: StatusPieChartProps) {
  // Filter out zero-count statuses to keep the chart clean
  const filtered = data.filter((d) => d.count > 0);
  const total    = filtered.reduce((s, d) => s + d.count, 0);

  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 shadow-sm flex flex-col items-center justify-center min-h-[280px]">
        <p className="text-sm text-[#9a9590]">ยังไม่มีข้อมูลสินค้า</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-[#e5e3de] p-5 shadow-sm"
      aria-label="กราฟสัดส่วนสถานะสินค้า"
    >
      <h3 className="text-sm font-semibold text-[#333] mb-4">
        สัดส่วนสถานะสินค้า{" "}
        <span className="text-xs font-normal text-[#9a9590]">({total} รายการ)</span>
      </h3>

      <div style={{ minHeight: 280 }}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="45%"
              innerRadius="48%"   /* donut hole */
              outerRadius="72%"
              paddingAngle={2}
              stroke="none"
            >
              {filtered.map((entry, i) => (
                <Cell
                  key={entry.status}
                  fill={PALETTE[i % PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={legendFormatter}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
