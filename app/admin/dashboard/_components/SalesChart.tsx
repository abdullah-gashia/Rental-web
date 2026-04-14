"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  data: { date: string; sales: number; revenue: number }[];
}

// Format YYYY-MM-DD → "1 ม.ค." style short date
const MONTH_SHORT: Record<number, string> = {
  0: "ม.ค.", 1: "ก.พ.", 2: "มี.ค.", 3: "เม.ย.", 4: "พ.ค.", 5: "มิ.ย.",
  6: "ก.ค.", 7: "ส.ค.", 8: "ก.ย.", 9: "ต.ค.", 10: "พ.ย.", 11: "ธ.ค.",
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function formatBaht(v: number): string {
  return new Intl.NumberFormat("th-TH", {
    style:    "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(v);
}

// Custom tooltip with Thai labels
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e5e3de] rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-[#333] mb-1.5">{label ? formatDate(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="font-medium">
            {p.name === "sales" ? "จำนวนขาย:" : "รายได้:"}
          </span>{" "}
          {p.name === "sales" ? `${p.value} รายการ` : formatBaht(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function SalesChart({ data }: SalesChartProps) {
  const formatted = data.map((d) => ({ ...d, dateLabel: formatDate(d.date) }));

  return (
    <div
      className="bg-white rounded-2xl border border-[#e5e3de] p-5 shadow-sm"
      aria-label="กราฟยอดขายรายวัน 7 วันล่าสุด"
    >
      <h3 className="text-sm font-semibold text-[#333] mb-4">
        ยอดขายรายวัน{" "}
        <span className="text-xs font-normal text-[#9a9590]">(7 วันล่าสุด)</span>
      </h3>

      {/* min-h ensures ResponsiveContainer has a non-zero height during SSR */}
      <div style={{ minHeight: 280 }}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={formatted}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede7" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "#9a9590" }}
              axisLine={false}
              tickLine={false}
            />
            {/* Left Y-axis: sales count */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 11, fill: "#9a9590" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            {/* Right Y-axis: revenue in ฿ */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#9a9590" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) =>
                value === "sales" ? "จำนวนรายการ" : "รายได้ (฿)"
              }
              wrapperStyle={{ fontSize: 12, color: "#555" }}
            />
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="#e8500a"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: "#6366f1" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
