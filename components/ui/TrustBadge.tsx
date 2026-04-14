"use client";

interface TrustBadgeProps {
  score: number;
  /** "sm" shows only the icon+score; "md" (default) adds the label */
  size?: "sm" | "md";
}

interface Tier {
  label: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
  tooltip: string;
}

function getTier(score: number): Tier {
  if (score >= 90) {
    return {
      label:   "น่าเชื่อถือสูง",
      icon:    "✦",
      bg:      "bg-emerald-50",
      text:    "text-emerald-700",
      border:  "border-emerald-200",
      tooltip: `คะแนน ${score} — ผู้ใช้คนนี้ผ่านธุรกรรมสำเร็จหลายครั้งและมีรีวิวดีเยี่ยม`,
    };
  }
  if (score >= 50) {
    return {
      label:   "มาตรฐาน",
      icon:    "●",
      bg:      "bg-amber-50",
      text:    "text-amber-700",
      border:  "border-amber-200",
      tooltip: `คะแนน ${score} — ผู้ใช้ทั่วไป ควรตรวจสอบก่อนทำธุรกรรม`,
    };
  }
  return {
    label:   "ความน่าเชื่อถือต่ำ",
    icon:    "▼",
    bg:      "bg-red-50",
    text:    "text-red-700",
    border:  "border-red-200",
    tooltip: `คะแนน ${score} — ระวัง! ผู้ใช้คนนี้มีประวัติยกเลิกธุรกรรมหรือรีวิวแย่`,
  };
}

export default function TrustBadge({ score, size = "md" }: TrustBadgeProps) {
  const tier = getTier(score);

  return (
    <span
      title={tier.tooltip}
      className={`inline-flex items-center gap-1 border rounded-full font-semibold ${tier.bg} ${tier.text} ${tier.border} ${
        size === "sm"
          ? "text-[10px] px-1.5 py-0.5"
          : "text-xs px-2.5 py-1"
      }`}
    >
      <span className="leading-none">{tier.icon}</span>
      <span>{score}</span>
      {size === "md" && <span className="opacity-75">· {tier.label}</span>}
    </span>
  );
}
