import type { Locale } from "./dictionaries";

/**
 * Status wording, in both languages.
 *
 * These are the strings that appear most often in the whole product — every
 * list, every table row, every badge — and they lived in half a dozen Thai-only
 * constant maps scattered through the pages. One place, two languages, and a
 * lookup that falls back to the raw enum rather than to a blank cell.
 */

type Pair = { th: string; en: string };

const pick = (locale: Locale, p: Pair | undefined, fallback: string) =>
  p ? (locale === "en" ? p.en : p.th) : fallback;

// ── Marketplace orders ─────────────────────────────────────────────────────
const ORDER: Record<string, Pair> = {
  PENDING_CONFIRMATION:  { th: "รอยืนยัน",          en: "Awaiting confirmation" },
  FUNDS_HELD:            { th: "กักเงินแล้ว",        en: "Funds held" },
  AWAITING_SHIPMENT:     { th: "รอจัดส่ง",          en: "Awaiting shipment" },
  SHIPPED:               { th: "จัดส่งแล้ว",         en: "Shipped" },
  COD_SHIPPED:           { th: "จัดส่งแล้ว (COD)",   en: "Shipped (COD)" },
  DELIVERED:             { th: "รับสินค้าแล้ว",      en: "Delivered" },
  COD_DELIVERED:         { th: "รับ COD แล้ว",      en: "COD delivered" },
  MEETUP_SCHEDULED:      { th: "นัดพบแล้ว",         en: "Meet-up arranged" },
  MEETUP_ARRANGED:       { th: "นัดพบ (COD)",      en: "Meet-up (COD)" },
  MEETUP_COMPLETED:      { th: "พบกันสำเร็จ",       en: "Met up" },
  MEETUP_CASH_COMPLETED: { th: "พบกัน + รับเงิน",   en: "Met up, paid" },
  COMPLETED:             { th: "สำเร็จ",           en: "Completed" },
  DISPUTED:              { th: "มีข้อพิพาท",        en: "Disputed" },
  REFUNDED:              { th: "คืนเงินแล้ว",       en: "Refunded" },
  CANCELLED:             { th: "ยกเลิก",           en: "Cancelled" },
  CANCELLED_BY_ADMIN:    { th: "ยกเลิกโดยแอดมิน",  en: "Cancelled by admin" },
};

// ── Marketplace items ──────────────────────────────────────────────────────
const ITEM: Record<string, Pair> = {
  PENDING:     { th: "รอตรวจสอบ",   en: "In review" },
  APPROVED:    { th: "อนุมัติแล้ว",  en: "Live" },
  ACTIVE:      { th: "เผยแพร่",     en: "Live" },
  REJECTED:    { th: "ถูกปฏิเสธ",   en: "Rejected" },
  SOLD:        { th: "ขายแล้ว",     en: "Sold" },
  RENTED:      { th: "ให้เช่าอยู่",   en: "Rented out" },
  EXPIRED:     { th: "หมดอายุ",     en: "Expired" },
  REMOVED:     { th: "ถูกลบ",       en: "Removed" },
  UNAVAILABLE: { th: "ไม่พร้อม",     en: "Unavailable" },
};

// ── Borrowing ──────────────────────────────────────────────────────────────
const BORROW: Record<string, Pair> = {
  REQUESTED:                { th: "รออนุมัติ",             en: "Awaiting approval" },
  APPROVED:                 { th: "อนุมัติแล้ว",            en: "Approved" },
  REJECTED:                 { th: "ไม่อนุมัติ",             en: "Declined" },
  CANCELLED:                { th: "ยกเลิก",               en: "Cancelled" },
  PICKUP_SCHEDULED:         { th: "นัดรับแล้ว",            en: "Collection arranged" },
  ITEM_HANDED_OVER:         { th: "ส่งมอบแล้ว",            en: "Handed over" },
  ACTIVE:                   { th: "กำลังยืม",             en: "On loan" },
  OVERDUE:                  { th: "เกินกำหนดคืน",         en: "Overdue" },
  RENEWAL_REQUESTED:        { th: "ขอต่ออายุ",            en: "Renewal requested" },
  RENEWED:                  { th: "ต่ออายุแล้ว",           en: "Renewed" },
  RETURN_REQUESTED:         { th: "แจ้งคืนแล้ว",           en: "Return requested" },
  RETURN_SCHEDULED:         { th: "นัดคืนแล้ว",            en: "Return arranged" },
  RETURNED:                 { th: "คืนแล้ว",              en: "Returned" },
  COMPLETED:                { th: "เสร็จสิ้น",             en: "Completed" },
  COMPLETED_WITH_DEDUCTION: { th: "เสร็จสิ้น (มีความเสียหาย)", en: "Completed with damage" },
  DISPUTED:                 { th: "มีข้อพิพาท",            en: "Disputed" },
  LOST:                     { th: "สูญหาย",              en: "Lost" },
  PICKUP_IN_PROGRESS:       { th: "กำลังส่งมอบ",          en: "Handing over" },
  RETURN_IN_PROGRESS:       { th: "กำลังคืน",             en: "Returning" },
};

// ── Rental system ──────────────────────────────────────────────────────────
const RENTAL: Record<string, Pair> = {
  REQUESTED:                { th: "รอตอบรับ",       en: "Awaiting owner" },
  APPROVED:                 { th: "ตอบรับแล้ว",      en: "Accepted" },
  DEPOSIT_HELD:             { th: "กักเงินแล้ว",     en: "Deposit held" },
  REJECTED:                 { th: "ถูกปฏิเสธ",      en: "Declined" },
  EXPIRED:                  { th: "หมดอายุ",        en: "Expired" },
  CANCELLED:                { th: "ยกเลิก",         en: "Cancelled" },
  PICKUP_SCHEDULED:         { th: "นัดรับแล้ว",      en: "Collection arranged" },
  HANDED_OVER:              { th: "ส่งมอบแล้ว",      en: "Handed over" },
  ACTIVE:                   { th: "กำลังเช่า",       en: "On rent" },
  OVERDUE:                  { th: "เกินกำหนด",      en: "Overdue" },
  RENEWAL_REQUESTED:        { th: "ขอต่ออายุ",      en: "Renewal requested" },
  RETURN_SCHEDULED:         { th: "นัดคืนแล้ว",      en: "Return arranged" },
  RETURNED:                 { th: "คืนแล้ว",        en: "Returned" },
  COMPLETED:                { th: "เสร็จสิ้น",       en: "Completed" },
  COMPLETED_WITH_DEDUCTION: { th: "เสร็จ(หักค่าเสียหาย)", en: "Completed with deduction" },
  DISPUTED:                 { th: "มีข้อพิพาท",      en: "Disputed" },
  ITEM_LOST:                { th: "ของสูญหาย",      en: "Item lost" },
};

// ── Equipment on the lending shelf ─────────────────────────────────────────
const LEND_ITEM: Record<string, Pair> = {
  AVAILABLE:   { th: "ว่าง",             en: "Available" },
  RESERVED:    { th: "จองไว้",           en: "Reserved" },
  LENT_OUT:    { th: "ถูกยืมอยู่",        en: "On loan" },
  UNAVAILABLE: { th: "ไม่พร้อมให้ยืม",     en: "Not available" },
  SUSPENDED:   { th: "พักการให้ยืม",      en: "Withdrawn" },
};

const CONDITION: Record<string, Pair> = {
  LIKE_NEW:     { th: "เหมือนใหม่", en: "Like new" },
  GOOD:         { th: "สภาพดี",    en: "Good" },
  FAIR:         { th: "พอใช้",      en: "Fair" },
  NEEDS_REPAIR: { th: "ต้องซ่อม",    en: "Needs repair" },
};

const ROLE: Record<string, Pair> = {
  ADMIN:   { th: "แอดมิน",    en: "Admin" },
  STUDENT: { th: "นักศึกษา",  en: "Student" },
  PATTARA: { th: "งานภัทร",   en: "Pattara Office" },
};

const BORROW_CATEGORY: Record<string, Pair> = {
  TEXTBOOKS:         { th: "ตำราเรียน",           en: "Textbooks" },
  LAB_EQUIPMENT:     { th: "อุปกรณ์แล็บ",          en: "Lab equipment" },
  ELECTRONICS:       { th: "อิเล็กทรอนิกส์",        en: "Electronics" },
  TOOLS:             { th: "เครื่องมือช่าง",        en: "Tools" },
  SPORTS:            { th: "อุปกรณ์กีฬา",          en: "Sports gear" },
  MUSIC_INSTRUMENTS: { th: "เครื่องดนตรี",          en: "Instruments" },
  COSTUMES_OUTFITS:  { th: "ชุดและเครื่องแต่งกาย",   en: "Costumes" },
  STUDY_SUPPLIES:    { th: "อุปกรณ์การเรียน",       en: "Study supplies" },
  VEHICLES:          { th: "ยานพาหนะ",           en: "Vehicles" },
  OTHER:             { th: "อื่น ๆ",               en: "Other" },
};

export const orderStatus    = (l: Locale, s: string) => pick(l, ORDER[s], s);
export const itemStatus     = (l: Locale, s: string) => pick(l, ITEM[s], s);
export const borrowStatus   = (l: Locale, s: string) => pick(l, BORROW[s], s);
export const rentalStatus   = (l: Locale, s: string) => pick(l, RENTAL[s], s);
export const lendItemStatus = (l: Locale, s: string) => pick(l, LEND_ITEM[s], s);
export const conditionLabel = (l: Locale, s: string) => pick(l, CONDITION[s], s);
export const roleLabel      = (l: Locale, s: string) => pick(l, ROLE[s], s);
export const borrowCategory = (l: Locale, s: string) => pick(l, BORROW_CATEGORY[s], s);
