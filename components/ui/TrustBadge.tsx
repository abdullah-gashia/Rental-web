"use client";

import type { TrFn } from "@/lib/i18n/phrases";
import { useTr } from "@/lib/i18n/LocaleProvider";

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

function getTier(score: number, tr: TrFn): Tier {
  if (score >= 90) {
    return {
      label:   tr("น่าเชื่อถือสูง"),
      icon:    "✦",
      bg:      "bg-[var(--c-ok-soft)]",
      text:    "text-[var(--c-ok)]",
      border:  "border-[var(--c-ok-line)]",
      tooltip: tr("คะแนน {0} — ผู้ใช้คนนี้ผ่านธุรกรรมสำเร็จหลายครั้งและมีรีวิวดีเยี่ยม", [score]),
    };
  }
  if (score >= 50) {
    return {
      label:   tr("มาตรฐาน"),
      icon:    "●",
      bg:      "bg-[var(--c-warn-soft)]",
      text:    "text-[var(--c-warn)]",
      border:  "border-[var(--c-warn-line)]",
      tooltip: tr("คะแนน {0} — ผู้ใช้ทั่วไป ควรตรวจสอบก่อนทำธุรกรรม", [score]),
    };
  }
  return {
    label:   tr("ความน่าเชื่อถือต่ำ"),
    icon:    "▼",
    bg:      "bg-[var(--c-danger-soft)]",
    text:    "text-[var(--c-danger)]",
    border:  "border-[var(--c-danger-line)]",
    tooltip: tr("คะแนน {0} — ระวัง! ผู้ใช้คนนี้มีประวัติยกเลิกธุรกรรมหรือรีวิวแย่", [score]),
  };
}

export default function TrustBadge({ score, size = "md" }: TrustBadgeProps) {
  const tr = useTr();
  const tier = getTier(score, tr);

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
      {size === "md" && <span className="opacity-75">· {tr(tier.label)}</span>}
    </span>
  );
}
