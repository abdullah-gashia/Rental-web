// ─── Date formatting ──────────────────────────────────────────────────────────

const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                   "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export function formatThaiDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // Thai year = Gregorian + 543
  return `${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatRelativeDate(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return "เมื่อกี้";
  if (mins < 60)  return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} ชม. ที่แล้ว`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days} วันที่แล้ว`;
  return formatThaiDate(date);
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style:    "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("th-TH").format(n);
}

// ─── ID display ───────────────────────────────────────────────────────────────

export function truncateId(id: string, chars = 8): string {
  return `#${id.slice(-chars).toUpperCase()}`;
}

// ─── Pagination builder ───────────────────────────────────────────────────────

export function paginationMeta(
  totalCount: number,
  page: number,
  pageSize: number
) {
  return {
    currentPage: page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

// ─── Safe searchParam parsing ─────────────────────────────────────────────────

export function safeInt(v: string | undefined, fallback: number, max?: number): number {
  const n = parseInt(v ?? "", 10);
  if (isNaN(n) || n < 1) return fallback;
  return max ? Math.min(n, max) : n;
}

export function safeStr(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}
