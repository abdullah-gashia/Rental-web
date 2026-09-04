/**
 * Borrowing policy, in one place.
 *
 * These are the numbers a member of staff would want to change without a
 * developer, so they live together rather than scattered through the actions
 * that enforce them.
 *
 * Anyone with an account may borrow. There is deliberately no eligibility
 * gate: a service meant for students who are short of money should not make
 * them prove hardship to a database first. Who actually gets an item is the
 * office's judgement at the approval step.
 */

/** How many items one person may hold at the same time. */
export const MAX_CONCURRENT_BORROWS = 3;

/** Longest a single borrow may run, in days. */
export const MAX_BORROW_DAYS = 14;

/** Shortest sensible borrow, in days. */
export const MIN_BORROW_DAYS = 1;

/** How many times one borrow may be extended. */
export const MAX_RENEWALS = 1;

/** Days added by one renewal. */
export const RENEWAL_DAYS = 7;

/**
 * How long a request waits for the office before it cancels itself.
 *
 * Matches the marketplace's rental window on purpose — one timeout for the
 * whole site is easier to explain than two.
 */
export const REQUEST_TIMEOUT_DAYS = 7;

/**
 * Days past the due date before borrowing privileges are suspended.
 *
 * Nothing is charged. The penalty is losing access until the item comes back,
 * which is the only lever that makes sense for a welfare service.
 */
export const OVERDUE_GRACE_DAYS = 7;

/** Trust score removed once a borrow passes the grace period. */
export const OVERDUE_TRUST_PENALTY = 10;

/** Trust score awarded for returning on time. */
export const ON_TIME_TRUST_REWARD = 2;

/** Days before the due date a reminder goes out. */
export const REMINDER_DAYS_BEFORE = [3, 1, 0];

export const REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;

/** Thai labels for the equipment categories the office lends. */
export const BORROW_CATEGORY_LABEL: Record<string, string> = {
  TEXTBOOKS:         "ตำราเรียน",
  LAB_EQUIPMENT:     "อุปกรณ์แล็บ",
  ELECTRONICS:       "อิเล็กทรอนิกส์",
  TOOLS:             "เครื่องมือช่าง",
  SPORTS:            "อุปกรณ์กีฬา",
  MUSIC_INSTRUMENTS: "เครื่องดนตรี",
  COSTUMES_OUTFITS:  "ชุดและเครื่องแต่งกาย",
  STUDY_SUPPLIES:    "อุปกรณ์การเรียน",
  VEHICLES:          "ยานพาหนะ",
  OTHER:             "อื่น ๆ",
};

export const BORROW_CATEGORIES = Object.keys(BORROW_CATEGORY_LABEL);

export const CONDITION_LABEL: Record<string, string> = {
  LIKE_NEW:     "เหมือนใหม่",
  GOOD:         "สภาพดี",
  FAIR:         "พอใช้",
  NEEDS_REPAIR: "ต้องซ่อม",
};

export const ITEM_STATUS_LABEL: Record<string, string> = {
  AVAILABLE:   "ว่าง",
  RESERVED:    "จองไว้",
  LENT_OUT:    "ถูกยืมอยู่",
  UNAVAILABLE: "ไม่พร้อมให้ยืม",
  SUSPENDED:   "พักการให้ยืม",
};

/** Every state a borrow can be in, with the Thai wording users actually see. */
export const BORROW_STATUS_LABEL: Record<string, string> = {
  REQUESTED:                "รออนุมัติ",
  APPROVED:                 "อนุมัติแล้ว",
  REJECTED:                 "ไม่อนุมัติ",
  CANCELLED:                "ยกเลิก",
  PICKUP_SCHEDULED:         "นัดรับแล้ว",
  ITEM_HANDED_OVER:         "ส่งมอบแล้ว",
  ACTIVE:                   "กำลังยืม",
  OVERDUE:                  "เกินกำหนดคืน",
  RENEWAL_REQUESTED:        "ขอต่ออายุ",
  RENEWED:                  "ต่ออายุแล้ว",
  RETURN_REQUESTED:         "แจ้งคืนแล้ว",
  RETURN_SCHEDULED:         "นัดคืนแล้ว",
  RETURNED:                 "คืนแล้ว",
  COMPLETED:                "เสร็จสิ้น",
  COMPLETED_WITH_DEDUCTION: "เสร็จสิ้น (มีความเสียหาย)",
  DISPUTED:                 "มีข้อพิพาท",
  LOST:                     "สูญหาย",
  DEPOSIT_HELD:             "—",
  PICKUP_IN_PROGRESS:       "กำลังส่งมอบ",
  RETURN_IN_PROGRESS:       "กำลังคืน",
};

/** Statuses where the item is out of the office's hands. */
export const OUT_STATUSES = [
  "ITEM_HANDED_OVER", "ACTIVE", "OVERDUE",
  "RENEWAL_REQUESTED", "RENEWED", "RETURN_REQUESTED", "RETURN_SCHEDULED",
] as const;

/** Statuses that still count against a borrower's concurrent limit. */
export const OPEN_STATUSES = [
  "REQUESTED", "APPROVED", "PICKUP_SCHEDULED",
  ...OUT_STATUSES, "RETURNED",
] as const;

/** Statuses where nothing more will happen. */
export const CLOSED_STATUSES = [
  "COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED",
  "CANCELLED", "LOST", "DISPUTED",
] as const;

/** The happy path, in order — used to draw progress in the UI. */
export const BORROW_STEPS = [
  { key: "REQUESTED",        label: "ขอยืม"    },
  { key: "APPROVED",         label: "อนุมัติ"   },
  { key: "PICKUP_SCHEDULED", label: "นัดรับ"    },
  { key: "ITEM_HANDED_OVER", label: "รับของ"    },
  { key: "ACTIVE",           label: "กำลังยืม"  },
  { key: "RETURN_SCHEDULED", label: "นัดคืน"    },
  { key: "RETURNED",         label: "คืนของ"    },
  { key: "COMPLETED",        label: "เสร็จสิ้น" },
] as const;
