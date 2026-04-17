/**
 * Rental system cron jobs — call these from an API route secured by CRON_SECRET
 * e.g. GET /api/cron/rentals?secret=... scheduled every hour via Vercel Cron or similar.
 *
 * Three jobs:
 *   processOverdueRentals()   — detect ACTIVE rentals past their end date → OVERDUE + late fees
 *   autoExpireRentalRequests() — expire REQUESTED orders not approved within 24h
 *   sendRentalReminders()     — notify renters 3 days, 1 day, and day-of due date
 */

import { prisma } from "@/lib/prisma";

// ─── 1. Overdue Detection ─────────────────────────────────────────────────────

export async function processOverdueRentals(): Promise<{ processed: number }> {
  const now = new Date();

  // Find ACTIVE orders whose rentalEndDate has passed
  const overdueOrders = await prisma.rentalOrder.findMany({
    where: {
      status: "ACTIVE",
      rentalEndDate: { lt: now },
    },
    include: {
      item: { select: { lateFeePerDay: true, title: true } },
    },
  });

  let processed = 0;
  for (const order of overdueOrders) {
    const overdueDays = Math.ceil(
      (now.getTime() - new Date(order.rentalEndDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const lateFeePerDay = order.item.lateFeePerDay ?? 0;
    const accumulatedLateFees = lateFeePerDay * overdueDays;

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    await prisma.rentalOrder.update({
      where: { id: order.id },
      data: {
        status:   "OVERDUE",
        lateFees: accumulatedLateFees,
        statusHistory: [
          ...history,
          {
            status:    "OVERDUE",
            changedAt: now.toISOString(),
            note:      `เกินกำหนด ${overdueDays} วัน — ค่าปรับ ฿${accumulatedLateFees}`,
          },
        ],
      },
    });

    // Notify both parties
    await Promise.allSettled([
      prisma.notification.create({
        data: {
          userId:  order.renterId,
          type:    "ORDER",
          message: `⚠️ เกินกำหนดคืนของแล้ว! "${order.item.title}" เกินกำหนดคืน ${overdueDays} วัน — ค่าปรับ ฿${accumulatedLateFees}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId:  order.ownerId,
          type:    "ORDER",
          message: `⚠️ ผู้เช่ายังไม่คืนของ — "${order.item.title}" เกินกำหนดคืน ${overdueDays} วัน`,
        },
      }),
    ]);

    processed++;
  }

  // Also update already-OVERDUE orders to accumulate more late fees
  const existingOverdue = await prisma.rentalOrder.findMany({
    where: { status: "OVERDUE" },
    include: { item: { select: { lateFeePerDay: true } } },
  });

  for (const order of existingOverdue) {
    const overdueDays = Math.ceil(
      (now.getTime() - new Date(order.rentalEndDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const lateFeePerDay = order.item.lateFeePerDay ?? 0;
    const newLateFees   = lateFeePerDay * overdueDays;

    if (newLateFees !== order.lateFees) {
      await prisma.rentalOrder.update({
        where: { id: order.id },
        data: { lateFees: newLateFees },
      });
    }
  }

  return { processed };
}

// ─── 2. Auto-Expire Unapproved Requests ──────────────────────────────────────

export async function autoExpireRentalRequests(): Promise<{ expired: number }> {
  const now = new Date();

  const expiredOrders = await prisma.rentalOrder.findMany({
    where: {
      status:    "REQUESTED",
      expiresAt: { lt: now },
    },
    include: { item: { select: { title: true } } },
  });

  let expired = 0;
  for (const order of expiredOrders) {
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    await prisma.$transaction(async (tx) => {
      // Refund wallet
      await tx.user.update({
        where: { id: order.renterId },
        data: { walletBalance: { increment: order.totalPaid } },
      });

      // Restore item
      await tx.item.update({
        where: { id: order.itemId },
        data: { status: "APPROVED" },
      });

      // Update order
      await tx.rentalOrder.update({
        where: { id: order.id },
        data: {
          status: "EXPIRED",
          statusHistory: [
            ...history,
            {
              status:    "EXPIRED",
              changedAt: now.toISOString(),
              note:      "เจ้าของไม่ตอบรับภายใน 24 ชั่วโมง — คืนเงินให้ผู้เช่าแล้ว",
            },
          ],
        },
      });
    });

    // Notify renter
    await prisma.notification.create({
      data: {
        userId:  order.renterId,
        type:    "ORDER",
        message: `คำขอเช่าหมดอายุ — "${order.item.title}" เจ้าของไม่ตอบรับภายใน 24 ชั่วโมง เงินถูกคืนแล้ว`,
      },
    }).catch(() => {});

    expired++;
  }

  return { expired };
}

// ─── 3. Rental Reminders ─────────────────────────────────────────────────────

export async function sendRentalReminders(): Promise<{ sent: number }> {
  const now    = new Date();
  let sent = 0;

  // Calculate windows: 3 days, 1 day, 0 days (today)
  const windows = [
    { days: 3, label: "อีก 3 วัน",     urgent: false },
    { days: 1, label: "พรุ่งนี้",       urgent: true  },
    { days: 0, label: "วันนี้",         urgent: true  },
  ];

  for (const { days, label, urgent } of windows) {
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + days);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    const dueOrders = await prisma.rentalOrder.findMany({
      where: {
        status: "ACTIVE",
        rentalEndDate: { gte: windowStart, lte: windowEnd },
      },
      include: { item: { select: { title: true } } },
    });

    for (const order of dueOrders) {
      await Promise.allSettled([
        prisma.notification.create({
          data: {
            userId:  order.renterId,
            type:    "ORDER",
            message: urgent
              ? `⏰ ครบกำหนดคืน "${order.item.title}" ${label}! อย่าลืมนัดคืนกับเจ้าของ`
              : `📅 กำหนดคืนของ ${label} — "${order.item.title}" ครบกำหนดคืนใน${label} อย่าลืมนัดคืนกับเจ้าของ`,
          },
        }),
      ]);
      sent++;
    }
  }

  return { sent };
}
