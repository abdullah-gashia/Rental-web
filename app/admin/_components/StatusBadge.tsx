// Server Component — no interactivity needed.

type BadgeSpec = { label: string; cls: string };

const USER_STATUS: Record<string, BadgeSpec> = {
  ACTIVE:  { label: "ปกติ",      cls: "bg-green-50  text-green-700  border-green-200"  },
  BANNED:  { label: "ถูกแบน",    cls: "bg-red-50    text-red-700    border-red-200"    },
};

const ROLE: Record<string, BadgeSpec> = {
  ADMIN:   { label: "แอดมิน",    cls: "bg-purple-50 text-purple-700 border-purple-200" },
  STUDENT: { label: "นักศึกษา",  cls: "bg-gray-50   text-gray-600   border-gray-200"   },
};

const ITEM_STATUS: Record<string, BadgeSpec> = {
  APPROVED:    { label: "อนุมัติแล้ว",  cls: "bg-green-50  text-green-700  border-green-200"  },
  PENDING:     { label: "รออนุมัติ",    cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ACTIVE:      { label: "กำลังขาย",    cls: "bg-blue-50   text-blue-700   border-blue-200"   },
  SOLD:        { label: "ขายแล้ว",     cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  RENTED:      { label: "ให้เช่าแล้ว", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  REJECTED:    { label: "ถูกปฏิเสธ",   cls: "bg-red-50    text-red-700    border-red-200"    },
  EXPIRED:     { label: "หมดอายุ",     cls: "bg-gray-50   text-gray-500   border-gray-200"   },
  REMOVED:     { label: "ถูกลบ",       cls: "bg-gray-50   text-gray-500   border-gray-200"   },
  UNAVAILABLE: { label: "ไม่พร้อม",    cls: "bg-gray-50   text-gray-500   border-gray-200"   },
};

const ORDER_STATUS: Record<string, BadgeSpec> = {
  // ── Legacy statuses ──
  FUNDS_HELD:            { label: "กักเงินแล้ว",         cls: "bg-yellow-50  text-yellow-700  border-yellow-200"  },
  SHIPPED:               { label: "จัดส่งแล้ว",           cls: "bg-blue-50    text-blue-700    border-blue-200"    },
  COMPLETED:             { label: "สำเร็จ",               cls: "bg-green-50   text-green-700   border-green-200"   },
  DISPUTED:              { label: "มีข้อพิพาท",           cls: "bg-orange-50  text-orange-700  border-orange-200"  },
  REFUNDED:              { label: "คืนเงินแล้ว",          cls: "bg-purple-50  text-purple-700  border-purple-200"  },
  CANCELLED:             { label: "ยกเลิก",               cls: "bg-red-50     text-red-700     border-red-200"     },
  CANCELLED_BY_ADMIN:    { label: "ยกเลิกโดยแอดมิน",     cls: "bg-red-50     text-red-700     border-red-200"     },
  // ── Checkout wizard — Escrow ──
  PENDING_CONFIRMATION:  { label: "รอยืนยัน",            cls: "bg-yellow-50  text-yellow-700  border-yellow-200"  },
  DELIVERED:             { label: "รับสินค้าแล้ว",        cls: "bg-teal-50    text-teal-700    border-teal-200"    },
  // ── Escrow + Meetup ──
  MEETUP_SCHEDULED:      { label: "นัดพบแล้ว",           cls: "bg-blue-50    text-blue-700    border-blue-200"    },
  MEETUP_COMPLETED:      { label: "พบกันสำเร็จ",         cls: "bg-green-50   text-green-700   border-green-200"   },
  // ── COD + Shipping ──
  AWAITING_SHIPMENT:     { label: "รอจัดส่ง",            cls: "bg-amber-50   text-amber-700   border-amber-200"   },
  COD_SHIPPED:           { label: "จัดส่งแล้ว (COD)",    cls: "bg-blue-50    text-blue-700    border-blue-200"    },
  COD_DELIVERED:         { label: "รับ COD แล้ว",        cls: "bg-green-50   text-green-700   border-green-200"   },
  // ── COD + Meetup ──
  MEETUP_ARRANGED:       { label: "นัดพบ (COD)",         cls: "bg-sky-50     text-sky-700     border-sky-200"     },
  MEETUP_CASH_COMPLETED: { label: "พบกัน + รับเงิน",     cls: "bg-green-50   text-green-700   border-green-200"   },
};

const MAPS = { user: USER_STATUS, role: ROLE, item: ITEM_STATUS, order: ORDER_STATUS };

interface StatusBadgeProps {
  status: string;
  type:   "user" | "role" | "item" | "order";
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const spec = MAPS[type][status] ?? {
    label: status,
    cls:   "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${spec.cls}`}
    >
      {spec.label}
    </span>
  );
}
