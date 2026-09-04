/** Thai labels and badge colours for every RentalOrderStatus, shared by the
 *  lending overview and the per-order detail page. */

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED:                "รอตอบรับ",
  APPROVED:                 "ตอบรับแล้ว",
  DEPOSIT_HELD:             "กักเงินแล้ว",
  REJECTED:                 "ถูกปฏิเสธ",
  EXPIRED:                  "หมดอายุ",
  CANCELLED:                "ยกเลิก",
  PICKUP_SCHEDULED:         "นัดรับแล้ว",
  HANDED_OVER:              "ส่งมอบแล้ว",
  ACTIVE:                   "กำลังเช่า",
  OVERDUE:                  "เกินกำหนด",
  RENEWAL_REQUESTED:        "ขอต่ออายุ",
  RETURN_SCHEDULED:         "นัดคืนแล้ว",
  RETURNED:                 "คืนแล้ว",
  COMPLETED:                "เสร็จสิ้น",
  COMPLETED_WITH_DEDUCTION: "เสร็จ(หักค่าเสียหาย)",
  DISPUTED:                 "มีข้อพิพาท",
  ITEM_LOST:                "ของสูญหาย",
};

export const STATUS_COLOR: Record<string, string> = {
  REQUESTED:                "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED:                 "bg-blue-50 text-blue-700 border-blue-200",
  DEPOSIT_HELD:             "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED:                 "bg-gray-50 text-gray-600 border-gray-200",
  EXPIRED:                  "bg-gray-50 text-gray-600 border-gray-200",
  CANCELLED:                "bg-gray-50 text-gray-600 border-gray-200",
  PICKUP_SCHEDULED:         "bg-purple-50 text-purple-700 border-purple-200",
  HANDED_OVER:              "bg-purple-50 text-purple-700 border-purple-200",
  ACTIVE:                   "bg-green-50 text-green-700 border-green-200",
  OVERDUE:                  "bg-red-50 text-red-700 border-red-200",
  RENEWAL_REQUESTED:        "bg-amber-50 text-amber-700 border-amber-200",
  RETURN_SCHEDULED:         "bg-orange-50 text-orange-700 border-orange-200",
  RETURNED:                 "bg-teal-50 text-teal-700 border-teal-200",
  COMPLETED:                "bg-green-50 text-green-700 border-green-200",
  COMPLETED_WITH_DEDUCTION: "bg-amber-50 text-amber-700 border-amber-200",
  DISPUTED:                 "bg-red-50 text-red-700 border-red-200",
  ITEM_LOST:                "bg-red-100 text-red-800 border-red-300",
};

export function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

export function statusColor(status: string) {
  return STATUS_COLOR[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
}

/**
 * The happy path, in order.
 *
 * Used to draw the progress rail on the detail page. Statuses that end a
 * rental early (REJECTED, EXPIRED, CANCELLED, DISPUTED, ITEM_LOST) are not on
 * it — those are shown as a terminal state instead of a step.
 */
export const RENTAL_STEPS = [
  { key: "REQUESTED",        label: "ขอเช่า",   hint: "ผู้เช่าส่งคำขอ รอเจ้าของตอบรับ" },
  { key: "APPROVED",         label: "ตอบรับ",   hint: "เจ้าของอนุมัติคำขอแล้ว"          },
  { key: "PICKUP_SCHEDULED", label: "นัดรับ",   hint: "ตกลงวันเวลาและจุดนัดรับ"          },
  { key: "HANDED_OVER",      label: "ส่งมอบ",   hint: "ยืนยันการส่งมอบทั้งสองฝ่าย"       },
  { key: "ACTIVE",           label: "กำลังเช่า", hint: "อยู่ในระหว่างระยะเวลาเช่า"        },
  { key: "RETURN_SCHEDULED", label: "นัดคืน",   hint: "ตกลงวันเวลาและจุดนัดคืน"          },
  { key: "RETURNED",         label: "คืนแล้ว",  hint: "ยืนยันการคืนทั้งสองฝ่าย"          },
  { key: "COMPLETED",        label: "เสร็จสิ้น", hint: "คืนมัดจำและจ่ายเงินเจ้าของแล้ว"   },
] as const;

/** Statuses that mean the rental ended without finishing the flow above. */
export const TERMINAL_BAD = ["REJECTED", "EXPIRED", "CANCELLED", "DISPUTED", "ITEM_LOST"];
