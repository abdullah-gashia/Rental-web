// Shared lending constants — NO "use server" directive.
// Import from here in both client and server components.

export const LENDING_CATEGORY_LABELS: Record<string, string> = {
  TEXTBOOKS: "หนังสือเรียน/ตำรา",
  LAB_EQUIPMENT: "อุปกรณ์แลป",
  ELECTRONICS: "อิเล็กทรอนิกส์",
  TOOLS: "เครื่องมือ",
  SPORTS: "อุปกรณ์กีฬา",
  MUSIC_INSTRUMENTS: "เครื่องดนตรี",
  COSTUMES_OUTFITS: "ชุดแต่งกาย",
  STUDY_SUPPLIES: "อุปกรณ์การเรียน",
  VEHICLES: "ยานพาหนะ",
  OTHER: "อื่นๆ",
};

export const LENDING_CATEGORY_EMOJI: Record<string, string> = {
  TEXTBOOKS: "📚",
  LAB_EQUIPMENT: "🔬",
  ELECTRONICS: "📷",
  TOOLS: "🔧",
  SPORTS: "⚽",
  MUSIC_INSTRUMENTS: "🎸",
  COSTUMES_OUTFITS: "👗",
  STUDY_SUPPLIES: "📐",
  VEHICLES: "🚲",
  OTHER: "📦",
};

export const CONDITION_LABELS: Record<string, string> = {
  LIKE_NEW: "เหมือนใหม่",
  GOOD: "สภาพดี",
  FAIR: "ใช้ได้",
  NEEDS_REPAIR: "มีร่องรอย",
};

export const RENTAL_TYPE_LABELS: Record<string, string> = {
  FREE: "ให้ยืมฟรี",
  DAILY_RATE: "คิดรายวัน",
  FLAT_FEE: "คิดเหมา",
};

export const LENDING_TIER_LABELS: Record<string, string> = {
  NEW_USER: "ผู้ใช้ใหม่",
  STANDARD: "มาตรฐาน",
  TRUSTED: "น่าเชื่อถือ",
  RESTRICTED: "ถูกจำกัด",
  BANNED: "ถูกแบน",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "รอตอบรับ",
  APPROVED: "อนุมัติแล้ว",
  DEPOSIT_HELD: "กักมัดจำแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
  PICKUP_SCHEDULED: "นัดรับแล้ว",
  PICKUP_IN_PROGRESS: "กำลังส่งมอบ",
  ITEM_HANDED_OVER: "ส่งมอบแล้ว",
  ACTIVE: "กำลังยืมอยู่",
  OVERDUE: "เกินกำหนด",
  RENEWAL_REQUESTED: "ขอต่ออายุ",
  RENEWED: "ต่ออายุแล้ว",
  RETURN_REQUESTED: "แจ้งคืนแล้ว",
  RETURN_SCHEDULED: "นัดคืนแล้ว",
  RETURN_IN_PROGRESS: "กำลังคืน",
  RETURNED: "คืนแล้ว",
  COMPLETED: "เสร็จสิ้น",
  COMPLETED_WITH_DEDUCTION: "เสร็จ (หักค่าเสียหาย)",
  DISPUTED: "ข้อพิพาท",
  LOST: "ของหาย",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  REQUESTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  DEPOSIT_HELD: "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-50 text-gray-600 border-gray-200",
  PICKUP_SCHEDULED: "bg-purple-50 text-purple-700 border-purple-200",
  PICKUP_IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
  ITEM_HANDED_OVER: "bg-green-50 text-green-700 border-green-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  RENEWAL_REQUESTED: "bg-orange-50 text-orange-700 border-orange-200",
  RENEWED: "bg-orange-50 text-orange-700 border-orange-200",
  RETURN_REQUESTED: "bg-blue-50 text-blue-700 border-blue-200",
  RETURN_SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  RETURN_IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  RETURNED: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  COMPLETED_WITH_DEDUCTION: "bg-amber-50 text-amber-700 border-amber-200",
  DISPUTED: "bg-red-50 text-red-700 border-red-200",
  LOST: "bg-red-100 text-red-800 border-red-300",
};
