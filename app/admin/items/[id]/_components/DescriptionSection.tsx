"use client";

import { useState } from "react";

interface Props {
  description: string | null;
}

export default function DescriptionSection({ description }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!description) {
    return (
      <div className="bg-white rounded-2xl border border-[#dfe7f2] p-6">
        <h3 className="text-sm font-semibold text-[#3d4d66] mb-3">คำอธิบาย</h3>
        <p className="text-sm text-[#94a3b8] italic">ไม่มีคำอธิบาย</p>
      </div>
    );
  }

  const isLong = description.length > 300;
  const displayText = isLong && !expanded ? description.slice(0, 300) + "..." : description;

  return (
    <div className="bg-white rounded-2xl border border-[#dfe7f2] p-6">
      <h3 className="text-sm font-semibold text-[#3d4d66] mb-3">คำอธิบาย</h3>
      <div className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">
        {displayText}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium transition-colors"
        >
          {expanded ? "ย่อ" : "อ่านเพิ่มเติม"}
        </button>
      )}
    </div>
  );
}
