/**
 * Preset reasons offered when reporting a user.
 *
 * Lives outside the "use server" module because a server-action file may only
 * export async functions — a plain array there fails the build.
 */
export const REPORT_CATEGORIES = [
  { value: "SCAM",       label: "หลอกลวง / ฉ้อโกง" },
  { value: "FAKE_ITEM",  label: "สินค้าปลอมหรือไม่ตรงปก" },
  { value: "NO_SHOW",    label: "นัดรับแล้วไม่มา / ไม่ส่งของ" },
  { value: "HARASSMENT", label: "คุกคามหรือใช้คำหยาบคาย" },
  { value: "PROHIBITED", label: "ขายของผิดกฎหมาย" },
  { value: "OTHER",      label: "อื่นๆ" },
] as const;

export const REPORT_CATEGORY_VALUES = new Set(REPORT_CATEGORIES.map((c) => c.value));

export const REPORT_CATEGORY_LABEL: Record<string, string> =
  Object.fromEntries(REPORT_CATEGORIES.map((c) => [c.value, c.label]));
