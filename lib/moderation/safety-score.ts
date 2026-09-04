/**
 * Safety scoring for marketplace listings.
 *
 * Produces a 0–100 score and maps it to one of three verdicts:
 *
 *   95–100  AUTO_APPROVE    publish immediately
 *   50–94   PENDING_REVIEW  hold for a human admin
 *    0–49   AUTO_REJECT     refuse outright
 *
 * Text only. Photographs are never inspected here, so a listing whose words
 * are clean is approved on that basis alone — see `imagesInspected` in the
 * result, and the note in lib/moderation/index.ts.
 */

export type ModerationVerdict = "AUTO_APPROVE" | "PENDING_REVIEW" | "AUTO_REJECT";

export interface SafetyResult {
  score: number;
  verdict: ModerationVerdict;
  /** Short Thai sentences explaining every deduction, most severe first. */
  reasons: string[];
  /** Always false: this scorer reads text, never the uploaded photos. */
  imagesInspected: false;
}

export interface ListingContent {
  title: string;
  description: string;
  contact?: string | null;
  location?: string | null;
  imageCount?: number;
}

// ─── Rule tables ──────────────────────────────────────────────────────────────

/**
 * A single hit drops the score below 50, which is an outright rejection.
 * Kept deliberately narrow: only wording that is unambiguous out of context.
 */
const SEVERE: { label: string; patterns: RegExp[] }[] = [
  {
    label: "คำหยาบคาย",
    patterns: [
      /เหี้ย|สัตว์ที่ไม่ใช่สัตว์|ควาย(เอ๊ย|เอ้ย)|ไอ้สัส|ไอ้เหี้ย|สัสๆ|มึงแม่|พ่อมึง|แม่มึง|ควยๆ|เย็ดแม่|อีดอก|กระหรี่/,
      /\bfuck(ing|er)?\b|\bmotherfuck\w*|\bcunt\b|\basshole\b|\bbitch\b/,
    ],
  },
  {
    label: "เนื้อหาทางเพศ",
    patterns: [
      /หนังโป๊|คลิปโป๊|นู้ด|เย็ด|ขายตัว|บริการทางเพศ|ค้าประเวณี|เซ็กส์ทอย|ไซด์ไลน์|หี|ควย|อวัยวะเพศ/,
      /\bporn\w*|\bnude\b|\bnudes\b|\bescort\b|\bsex\s*toy|\bxxx\b|\bonlyfans\b/,
    ],
  },
  {
    label: "ยาเสพติด",
    patterns: [
      /ยาบ้า|ยาไอซ์|ยาอี|กัญชาอัด|เฮโรอีน|โคเคน|ใบกระท่อม|ยาเค|ยานอนหลับเถื่อน/,
      /\bcocaine\b|\bheroin\b|\bmeth\b|\bmdma\b|\becstasy\b|\bketamine\b/,
    ],
  },
  {
    label: "อาวุธผิดกฎหมาย",
    patterns: [
      /ปืนเถื่อน|ปืนไทยประดิษฐ์|กระสุนจริง|ระเบิด|ปืนไฟฟ้าช็อต|มีดพก(ผิดกฎหมาย)?/,
      /\bhandgun\b|\bfirearm\b|\bammunition\b|\bgrenade\b|\bexplosive\b/,
    ],
  },
  {
    label: "ของผิดกฎหมายอื่น",
    patterns: [
      /บัตรประชาชนปลอม|วุฒิการศึกษาปลอม|ใบขับขี่ปลอม|รับทำเอกสารปลอม|ซิมผี|บัญชีม้า/,
      /\bfake\s*(id|passport|diploma)\b|\bstolen\s*(card|account)\b/,
    ],
  },
];

/**
 * Not proof of anything on its own, but enough to want a human to look.
 * Deductions here are capped so they can never reach an auto-rejection.
 */
const SUSPICIOUS: { label: string; patterns: RegExp[] }[] = [
  {
    label: "กดดันให้โอนเงินนอกระบบ",
    patterns: [
      /โอนก่อน|โอนมัดจำก่อน|โอนเต็มจำนวนก่อน|จ่ายนอกระบบ|ไม่รับเก็บเงินปลายทาง.*โอน|ปิดการขายนอกแอป/,
    ],
  },
  {
    label: "ชักชวนคุยนอกแพลตฟอร์ม",
    patterns: [
      /ทักไลน์เท่านั้น|ไลน์only|ห้ามคุยในแอป|แอดไลน์ก่อนซื้อ|ติดต่อนอกระบบ/,
      /\bline\s*only\b|\bdm\s*only\b|\bwhatsapp\s*only\b/,
    ],
  },
  {
    label: "สินค้าลอกเลียนแบบ",
    patterns: [
      /เกรดaaa|มิลเลอร์|ก็อปเกรด|ของก๊อป|ปลอมเกรด|hi-?end\s*copy|งานcopy/,
      /\breplica\b|\bmirror\s*quality\b|\baaa\s*grade\b/,
    ],
  },
  {
    label: "การพนัน / การเงินความเสี่ยงสูง",
    patterns: [
      /บาคาร่า|เว็บพนัน|สล็อตออนไลน์|แทงบอล|ลงทุนกำไรแน่นอน|ปันผลรายวัน|เทรดทองคำรับประกันกำไร/,
      /\bcasino\b|\bbetting\b|\bforex\s*signal\b|\bguaranteed\s*profit\b/,
    ],
  },
  {
    label: "คำโฆษณาเกินจริง / เร่งรัด",
    patterns: [
      /ด่วนที่สุด!!!|รีบตัดสินใจ|เหลือชิ้นสุดท้ายจริงๆ|ราคานี้วันนี้เท่านั้น|โอนภายใน\s*\d+\s*นาที/,
    ],
  },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

const SEVERE_PENALTY      = 55; // one hit lands at 45 → AUTO_REJECT
const SUSPICIOUS_PENALTY  = 18;
const SUSPICIOUS_CAP      = 45; // suspicion alone can never auto-reject
const QUALITY_CAP         = 24;

/** Lowercased, with zero-width characters and spacing tricks removed. */
function normalise(v: string): string {
  return v
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[​-‏﻿]/g, "");
}

/** Same text with every space and separator stripped, to catch "เ ห ี ้ ย". */
function compact(v: string): string {
  return normalise(v).replace(/[\s._\-*+|/\\]/g, "");
}

export function scoreListing(content: ListingContent): SafetyResult {
  const parts = [content.title, content.description, content.contact ?? "", content.location ?? ""];
  const joined = parts.join("\n");
  const text = normalise(joined);
  const tight = compact(joined);

  const reasons: string[] = [];
  let score = 100;

  // ── Severe: unambiguous policy violations ──
  const severeHits: string[] = [];
  for (const rule of SEVERE) {
    if (rule.patterns.some((re) => re.test(text) || re.test(tight))) {
      severeHits.push(rule.label);
    }
  }
  if (severeHits.length > 0) {
    score -= SEVERE_PENALTY * severeHits.length;
    reasons.push(`พบเนื้อหาต้องห้าม: ${severeHits.join(", ")}`);
  }

  // ── Suspicious: wants a human opinion ──
  const suspiciousHits: string[] = [];
  for (const rule of SUSPICIOUS) {
    if (rule.patterns.some((re) => re.test(text) || re.test(tight))) {
      suspiciousHits.push(rule.label);
    }
  }
  if (suspiciousHits.length > 0) {
    score -= Math.min(SUSPICIOUS_PENALTY * suspiciousHits.length, SUSPICIOUS_CAP);
    reasons.push(`พบสัญญาณที่ต้องตรวจสอบ: ${suspiciousHits.join(", ")}`);
  }

  // ── Quality: too little to judge on ──
  let qualityPenalty = 0;
  const desc = content.description.trim();

  if (desc.length < 15) {
    qualityPenalty += 8;
    reasons.push("คำอธิบายสั้นเกินไป ข้อมูลไม่พอประเมิน");
  }
  if ((content.imageCount ?? 0) === 0) {
    qualityPenalty += 8;
    reasons.push("ไม่มีรูปสินค้า");
  }
  if (/(.)\1{4,}/.test(joined)) {
    qualityPenalty += 6;
    reasons.push("มีอักขระซ้ำผิดปกติ");
  }
  const letters = joined.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20 && letters === letters.toUpperCase()) {
    qualityPenalty += 6;
    reasons.push("เขียนด้วยตัวพิมพ์ใหญ่ทั้งหมด");
  }
  const emojiCount = (joined.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojiCount > 6) {
    qualityPenalty += 6;
    reasons.push("ใช้อีโมจิมากเกินปกติ");
  }

  score -= Math.min(qualityPenalty, QUALITY_CAP);
  score = Math.max(0, Math.min(100, score));

  const verdict: ModerationVerdict =
    score >= 95 ? "AUTO_APPROVE" : score >= 50 ? "PENDING_REVIEW" : "AUTO_REJECT";

  if (reasons.length === 0) {
    reasons.push("ไม่พบความเสี่ยงจากข้อความ");
  }

  return { score, verdict, reasons, imagesInspected: false };
}
