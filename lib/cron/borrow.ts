/**
 * Background jobs for the งานภัทร borrowing service.
 *
 * Called from /api/cron/rentals alongside the marketplace jobs, so there is one
 * schedule to configure rather than two.
 *
 * Every notification written here is mirrored to e-mail automatically by the
 * extended client in lib/prisma.ts — that is why no mail is sent explicitly.
 */

import { prisma } from "@/lib/prisma";
import {
  REQUEST_TIMEOUT_DAYS, OVERDUE_GRACE_DAYS,
  OVERDUE_TRUST_PENALTY, REMINDER_DAYS_BEFORE,
} from "@/lib/borrow-config";

// ─── 1. Requests the office never answered ───────────────────────────────────

export async function autoExpireBorrowRequests(): Promise<{ expired: number }> {
  const cutoff = new Date(Date.now() - REQUEST_TIMEOUT_DAYS * 86_400_000);

  const stale = await prisma.lendingOrder.findMany({
    where: { status: "REQUESTED", requestedAt: { lt: cutoff } },
    include: { lendingItem: { select: { id: true, title: true } } },
  });

  for (const order of stale) {
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    await prisma.$transaction([
      prisma.lendingOrder.update({
        where: { id: order.id },
        data: {
          status:       "CANCELLED",
          cancelledAt:  new Date(),
          cancelReason: `เจ้าหน้าที่ไม่ตอบรับภายใน ${REQUEST_TIMEOUT_DAYS} วัน`,
          statusHistory: [...history, {
            status: "CANCELLED",
            changedAt: new Date().toISOString(),
            note: `ยกเลิกอัตโนมัติ — ไม่มีการตอบรับภายใน ${REQUEST_TIMEOUT_DAYS} วัน`,
          }] as never,
        },
      }),
      // Back on the shelf, so a stalled request does not hold an item hostage.
      prisma.lendingItem.update({
        where: { id: order.lendingItemId }, data: { status: "AVAILABLE" },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId:  order.borrowerId,
        type:    "BORROW",
        message: `คำขอยืม "${order.lendingItem.title}" ถูกยกเลิกอัตโนมัติ ` +
                 `เพราะไม่มีการตอบรับภายใน ${REQUEST_TIMEOUT_DAYS} วัน คุณสามารถขอยืมใหม่ได้`,
        link:    "/borrow",
      },
    }).catch(() => {});
  }

  return { expired: stale.length };
}

// ─── 2. Due-date reminders ───────────────────────────────────────────────────

export async function sendBorrowReminders(): Promise<{ sent: number }> {
  const now = new Date();
  let sent = 0;

  for (const days of REMINDER_DAYS_BEFORE) {
    const start = new Date(now);
    start.setDate(start.getDate() + days);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const due = await prisma.lendingOrder.findMany({
      where: {
        status:  { in: ["ACTIVE", "RENEWED"] },
        dueDate: { gte: start, lte: end },
      },
      include: { lendingItem: { select: { title: true } } },
    });

    for (const order of due) {
      const when = days === 0 ? "วันนี้" : days === 1 ? "พรุ่งนี้" : `อีก ${days} วัน`;
      await prisma.notification.create({
        data: {
          userId:  order.borrowerId,
          type:    "BORROW",
          message: days <= 1
            ? `⏰ ครบกำหนดคืน "${order.lendingItem.title}" ${when} — อย่าลืมนัดคืนกับงานภัทร`
            : `📅 "${order.lendingItem.title}" ครบกำหนดคืน${when}`,
          link:    `/borrow/orders/${order.id}`,
        },
      }).catch(() => {});
      sent++;
    }
  }

  return { sent };
}

// ─── 3. Overdue, and the suspension that follows ─────────────────────────────

export async function processOverdueBorrows(): Promise<{ flagged: number; suspended: number }> {
  const now = new Date();

  // 3a. Newly late — flag and tell both sides. No charge, just visibility.
  const late = await prisma.lendingOrder.findMany({
    where: { status: { in: ["ACTIVE", "RENEWED"] }, dueDate: { lt: now } },
    include: { lendingItem: { select: { title: true } } },
  });

  for (const order of late) {
    const overdueDays = Math.ceil((now.getTime() - order.dueDate!.getTime()) / 86_400_000);
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    await prisma.lendingOrder.update({
      where: { id: order.id },
      data: {
        status: "OVERDUE",
        statusHistory: [...history, {
          status: "OVERDUE",
          changedAt: now.toISOString(),
          note: `เกินกำหนดคืน ${overdueDays} วัน`,
        }] as never,
      },
    });

    await Promise.allSettled([
      prisma.notification.create({
        data: {
          userId:  order.borrowerId,
          type:    "BORROW",
          message: `⚠️ เลยกำหนดคืน "${order.lendingItem.title}" มา ${overdueDays} วันแล้ว ` +
                   `ไม่มีค่าปรับ แต่จะยืมชิ้นใหม่ไม่ได้จนกว่าจะคืน`,
          link:    `/borrow/orders/${order.id}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId:  order.lenderId,
          type:    "BORROW",
          message: `⚠️ "${order.lendingItem.title}" เกินกำหนดคืน ${overdueDays} วัน`,
          link:    `/pattara/orders/${order.id}`,
        },
      }),
    ]);
  }

  // 3b. Past the grace period — suspend borrowing until the item comes back.
  //
  // This is the whole enforcement model: the service takes away access, never
  // money. Someone who cannot afford to buy the equipment certainly cannot
  // afford a fine for keeping it too long.
  const graceCutoff = new Date(now.getTime() - OVERDUE_GRACE_DAYS * 86_400_000);

  const persistent = await prisma.lendingOrder.findMany({
    where: { status: "OVERDUE", dueDate: { lt: graceCutoff } },
    include: {
      lendingItem: { select: { title: true } },
      borrower:    { select: { id: true, borrowSuspendedUntil: true } },
    },
  });

  let suspended = 0;
  for (const order of persistent) {
    if (order.borrower.borrowSuspendedUntil && order.borrower.borrowSuspendedUntil > now) continue;

    // Suspended "until returned" — the date is far enough out that only a
    // return clears it, which confirmReturn does by setting it back to null.
    const until = new Date(now.getTime() + 365 * 86_400_000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: order.borrowerId },
        data: {
          borrowSuspendedUntil: until,
          lendingTier: "RESTRICTED",
          trustScore: { decrement: OVERDUE_TRUST_PENALTY },
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId:  order.borrowerId,
        type:    "BORROW",
        message: `สิทธิ์การยืมของคุณถูกระงับ เพราะยังไม่ได้คืน "${order.lendingItem.title}" ` +
                 `เกิน ${OVERDUE_GRACE_DAYS} วัน — คืนของแล้วสิทธิ์จะกลับมาทันที`,
        link:    `/borrow/orders/${order.id}`,
      },
    }).catch(() => {});

    suspended++;
  }

  return { flagged: late.length, suspended };
}
