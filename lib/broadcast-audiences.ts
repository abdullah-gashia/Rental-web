/**
 * Broadcast audiences.
 *
 * Plain constants rather than part of the server-action file: a "use server"
 * module may only export async functions, so a shared label map has to live
 * somewhere the client can import it from too.
 */

export type Audience = "ALL" | "VERIFIED" | "SELLERS" | "BUYERS";

export const AUDIENCE_VALUES: Audience[] = ["ALL", "VERIFIED", "SELLERS", "BUYERS"];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL:      "ผู้ใช้ทั้งหมด",
  VERIFIED: "เฉพาะผู้ที่ยืนยันตัวตนแล้ว",
  SELLERS:  "เฉพาะผู้ที่เคยลงประกาศ",
  BUYERS:   "เฉพาะผู้ที่เคยสั่งซื้อ",
};

export const AUDIENCE_HINT: Record<Audience, string> = {
  ALL:      "นักศึกษาทุกคนที่ไม่ถูกแบน",
  VERIFIED: "ผ่านการยืนยันตัวตน KYC แล้ว",
  SELLERS:  "เคยลงประกาศสินค้าอย่างน้อย 1 ชิ้น",
  BUYERS:   "เคยสั่งซื้อผ่านระบบอย่างน้อย 1 ครั้ง",
};
