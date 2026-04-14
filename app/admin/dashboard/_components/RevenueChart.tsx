"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date:   string;
  fee:    number;
  orders: number;
}

interface RevenueChartProps {
  data: DataPoint[];
}

// Format "YYYY-MM-DD" → short Thai label e.g. "14 เม.ย."
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function baht(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", maximumFractionDigits: 0,
  }).format(n);
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const fee    = payload[0]?.value ?? 0;
  const orders = payload[1]?.value ?? 0;
  return (
    <div className="bg-white border border-[#e5e3de] rounded-xl px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-bold text-[#111] mb-1">{fmtDate(label)}</p>
      <p className="text-purple-700 font-semibold">รายได้แพลตฟอร์ม: {baht(fee)}</p>
      <p className="text-[#9a9590]">คำสั่งซื้อ: {orders} รายการ</p>
    </div>
  );
}

export default function RevenueChart({ data }: RevenueChartProps) {
  // Sparse ticks: show every other label so the axis doesn't crowd on mobile
  const tickDates = data.filter((_, i) => i % 2 === 0).map((d) => d.date);

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#111]">รายได้แพลตฟอร์ม (14 วัน)</h3>
          <p className="text-xs text-[#9a9590] mt-0.5">ค่าธรรมเนียมที่เก็บได้จากคำสั่งซื้อที่เสร็จสิ้น</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
          Platform Fee
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ede7" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={tickDates}
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: "#9a9590" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `฿${v}`}
            tick={{ fontSize: 10, fill: "#9a9590" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f7f6f3" }} />
          <Bar dataKey="fee"    fill="#7c3aed" radius={[4, 4, 0, 0]} name="ค่าธรรมเนียม" />
          <Bar dataKey="orders" fill="#ddd6fe" radius={[4, 4, 0, 0]} name="คำสั่งซื้อ" yAxisId={0} hide />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
