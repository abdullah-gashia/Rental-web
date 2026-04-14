"use client";

import { formatThaiDate, formatNumber, truncateId } from "../../../_lib/utils";
import { useState } from "react";

interface Props {
  item: {
    id: string;
    createdAt: string;
    updatedAt: string;
    lastViewedAt: string | null;
    viewCount: number;
    wishlistCount: number;
    interactionCount: number;
    reportCount: number;
  };
}

export default function SystemMetadataCard({ item }: Props) {
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
      <h3 className="text-sm font-semibold text-[#555] mb-4">ข้อมูลระบบ</h3>

      <div className="space-y-3">
        {/* Item ID */}
        <Row label="Item ID">
          <button
            onClick={copyId}
            className="text-xs text-[#888] hover:text-[#555] transition-colors font-mono flex items-center gap-1"
            title="คัดลอก ID"
          >
            {truncateId(item.id)}
            <span className="text-sm">{copied ? "✅" : "📋"}</span>
          </button>
        </Row>

        {/* Created */}
        <Row label="สร้างเมื่อ">
          <span className="text-sm text-[#333]">
            {formatThaiDateWithTime(item.createdAt)}
          </span>
        </Row>

        {/* Updated */}
        <Row label="แก้ไขล่าสุด">
          <span className="text-sm text-[#333]">
            {formatThaiDateWithTime(item.updatedAt)}
          </span>
        </Row>

        {/* Last viewed */}
        <Row label="เข้าชมล่าสุด">
          <span className="text-sm text-[#333]">
            {item.lastViewedAt
              ? formatThaiDateWithTime(item.lastViewedAt)
              : "ยังไม่มีผู้เข้าชม"}
          </span>
        </Row>

        {/* Divider */}
        <div className="border-t border-[#f0ede7] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon="👁" label="เข้าชม" value={`${formatNumber(item.viewCount)} ครั้ง`} />
            <StatBox icon="❤️" label="Wishlist" value={`${formatNumber(item.wishlistCount)}`} />
            <StatBox icon="📊" label="Interactions" value={`${formatNumber(item.interactionCount)}`} />
            <StatBox
              icon="⚠️"
              label="รายงาน"
              value={`${item.reportCount}`}
              danger={item.reportCount > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-[#888] flex-shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function StatBox({
  icon, label, value, danger = false,
}: {
  icon: string; label: string; value: string; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 text-center ${danger ? "bg-red-50" : "bg-[#faf9f7]"}`}>
      <span className="text-lg">{icon}</span>
      <p className={`text-sm font-semibold mt-0.5 ${danger ? "text-red-600" : "text-[#333]"}`}>
        {value}
      </p>
      <p className="text-xs text-[#888]">{label}</p>
    </div>
  );
}

function formatThaiDateWithTime(date: string): string {
  const d = new Date(date);
  const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                     "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543} ${hours}:${mins}`;
}
