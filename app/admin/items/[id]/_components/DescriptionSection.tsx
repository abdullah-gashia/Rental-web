"use client";

import { useState } from "react";

interface Props {
  description: string | null;
}

export default function DescriptionSection({ description }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!description) {
    return (
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
        <h3 className="text-sm font-semibold text-[#555] mb-3">คำอธิบาย</h3>
        <p className="text-sm text-[#aaa] italic">ไม่มีคำอธิบาย</p>
      </div>
    );
  }

  const isLong = description.length > 300;
  const displayText = isLong && !expanded ? description.slice(0, 300) + "..." : description;

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-6">
      <h3 className="text-sm font-semibold text-[#555] mb-3">คำอธิบาย</h3>
      <div className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">
        {displayText}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-sm text-[#e8500a] hover:text-[#c94208] font-medium transition-colors"
        >
          {expanded ? "ย่อ" : "อ่านเพิ่มเติม"}
        </button>
      )}
    </div>
  );
}
