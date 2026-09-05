// Server Component — no interactivity needed.

type BadgeSpec = { label: string; cls: string };

const USER_STATUS: Record<string, BadgeSpec> = {
  ACTIVE:  { label: "ปกติ",      cls: "bg-[var(--c-ok-soft)]  text-[var(--c-ok)]  border-[var(--c-ok-line)]"  },
  BANNED:  { label: "ถูกแบน",    cls: "bg-[var(--c-danger-soft)]    text-[var(--c-danger)]    border-[var(--c-danger-line)]"    },
};

const ROLE: Record<string, BadgeSpec> = {
  ADMIN:   { label: "แอดมิน",    cls: "bg-purple-50 text-purple-700 border-purple-200" },
  STUDENT: { label: "นักศึกษา",  cls: "bg-[var(--c-subtle)]   text-[var(--c-ink-3)]   border-[var(--c-line)]"   },
  PATTARA: { label: "งานภัทร",   cls: "bg-[var(--c-accent-soft)]   text-[var(--c-accent-str)]   border-[var(--c-line-str)]"   },
};

const ITEM_STATUS: Record<string, BadgeSpec> = {
  APPROVED:    { label: "อนุมัติแล้ว",  cls: "bg-[var(--c-ok-soft)]  text-[var(--c-ok)]  border-[var(--c-ok-line)]"  },
  PENDING:     { label: "รออนุมัติ",    cls: "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]" },
  ACTIVE:      { label: "กำลังขาย",    cls: "bg-[var(--c-accent-soft)]   text-[var(--c-accent-str)]   border-[var(--c-line-str)]"   },
  SOLD:        { label: "ขายแล้ว",     cls: "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-indigo-200" },
  RENTED:      { label: "ให้เช่าแล้ว", cls: "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-indigo-200" },
  REJECTED:    { label: "ถูกปฏิเสธ",   cls: "bg-[var(--c-danger-soft)]    text-[var(--c-danger)]    border-[var(--c-danger-line)]"    },
  EXPIRED:     { label: "หมดอายุ",     cls: "bg-[var(--c-subtle)]   text-[var(--c-muted)]   border-[var(--c-line)]"   },
  REMOVED:     { label: "ถูกลบ",       cls: "bg-[var(--c-subtle)]   text-[var(--c-muted)]   border-[var(--c-line)]"   },
  UNAVAILABLE: { label: "ไม่พร้อม",    cls: "bg-[var(--c-subtle)]   text-[var(--c-muted)]   border-[var(--c-line)]"   },
};

const ORDER_STATUS: Record<string, BadgeSpec> = {
  // ── Legacy statuses ──
  FUNDS_HELD:            { label: "กักเงินแล้ว",         cls: "bg-[var(--c-warn-soft)]  text-[var(--c-warn)]  border-[var(--c-warn-line)]"  },
  SHIPPED:               { label: "จัดส่งแล้ว",           cls: "bg-[var(--c-accent-soft)]    text-[var(--c-accent-str)]    border-[var(--c-line-str)]"    },
  COMPLETED:             { label: "สำเร็จ",               cls: "bg-[var(--c-ok-soft)]   text-[var(--c-ok)]   border-[var(--c-ok-line)]"   },
  DISPUTED:              { label: "มีข้อพิพาท",           cls: "bg-[var(--c-warn-soft)]  text-[var(--c-warn)]  border-[var(--c-warn-line)]"  },
  REFUNDED:              { label: "คืนเงินแล้ว",          cls: "bg-purple-50  text-purple-700  border-purple-200"  },
  CANCELLED:             { label: "ยกเลิก",               cls: "bg-[var(--c-danger-soft)]     text-[var(--c-danger)]     border-[var(--c-danger-line)]"     },
  CANCELLED_BY_ADMIN:    { label: "ยกเลิกโดยแอดมิน",     cls: "bg-[var(--c-danger-soft)]     text-[var(--c-danger)]     border-[var(--c-danger-line)]"     },
  // ── Checkout wizard — Escrow ──
  PENDING_CONFIRMATION:  { label: "รอยืนยัน",            cls: "bg-[var(--c-warn-soft)]  text-[var(--c-warn)]  border-[var(--c-warn-line)]"  },
  DELIVERED:             { label: "รับสินค้าแล้ว",        cls: "bg-teal-50    text-teal-700    border-teal-200"    },
  // ── Escrow + Meetup ──
  MEETUP_SCHEDULED:      { label: "นัดพบแล้ว",           cls: "bg-[var(--c-accent-soft)]    text-[var(--c-accent-str)]    border-[var(--c-line-str)]"    },
  MEETUP_COMPLETED:      { label: "พบกันสำเร็จ",         cls: "bg-[var(--c-ok-soft)]   text-[var(--c-ok)]   border-[var(--c-ok-line)]"   },
  // ── COD + Shipping ──
  AWAITING_SHIPMENT:     { label: "รอจัดส่ง",            cls: "bg-[var(--c-warn-soft)]   text-[var(--c-warn)]   border-[var(--c-warn-line)]"   },
  COD_SHIPPED:           { label: "จัดส่งแล้ว (COD)",    cls: "bg-[var(--c-accent-soft)]    text-[var(--c-accent-str)]    border-[var(--c-line-str)]"    },
  COD_DELIVERED:         { label: "รับ COD แล้ว",        cls: "bg-[var(--c-ok-soft)]   text-[var(--c-ok)]   border-[var(--c-ok-line)]"   },
  // ── COD + Meetup ──
  MEETUP_ARRANGED:       { label: "นัดพบ (COD)",         cls: "bg-[var(--c-accent-soft)]     text-sky-700     border-sky-200"     },
  MEETUP_CASH_COMPLETED: { label: "พบกัน + รับเงิน",     cls: "bg-[var(--c-ok-soft)]   text-[var(--c-ok)]   border-[var(--c-ok-line)]"   },
};

const MAPS = { user: USER_STATUS, role: ROLE, item: ITEM_STATUS, order: ORDER_STATUS };

interface StatusBadgeProps {
  status: string;
  type:   "user" | "role" | "item" | "order";
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const spec = MAPS[type][status] ?? {
    label: status,
    cls:   "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${spec.cls}`}
    >
      {spec.label}
    </span>
  );
}
