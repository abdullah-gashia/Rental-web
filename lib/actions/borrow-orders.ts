"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOffice, borrowBlockReason, type SessionUser } from "@/lib/permissions";
import {
  MAX_CONCURRENT_BORROWS, MAX_BORROW_DAYS, MIN_BORROW_DAYS,
  MAX_RENEWALS, RENEWAL_DAYS,
  ON_TIME_TRUST_REWARD, OPEN_STATUSES,
} from "@/lib/borrow-config";
import type { LendingOrderStatus, ItemCondition } from "@prisma/client";

/**
 * The borrow lifecycle.
 *
 * No money moves anywhere in this file, by design. Handing an item over and
 * getting it back are both two-sided confirmations with photographs, because
 * those photographs are the only evidence there is when someone disagrees
 * about what condition something was in.
 */

export type ActionResult =
  | { success: true;  message: string; id?: string }
  | { success: false; error: string };

type HistoryEntry = { status: string; changedAt: string; note?: string; by?: string };

function history(raw: unknown): HistoryEntry[] {
  return Array.isArray(raw) ? (raw as HistoryEntry[]) : [];
}

function pushHistory(raw: unknown, entry: Omit<HistoryEntry, "changedAt">): HistoryEntry[] {
  return [...history(raw), { ...entry, changedAt: new Date().toISOString() }];
}

type PartyLoad =
  | { ok: false; error: string }
  | {
      ok: true;
      order: NonNullable<Awaited<ReturnType<typeof findOrder>>>;
      isBorrower: boolean;
      isOffice: boolean;
    };

function findOrder(orderId: string) {
  return prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { id: true, title: true, isRenewable: true, maxRenewals: true } } },
  });
}

/** Loads an order and checks the caller is allowed anywhere near it. */
async function loadForParty(orderId: string, user: SessionUser): Promise<PartyLoad> {
  const order = await findOrder(orderId);
  if (!order) return { ok: false, error: "ไม่พบรายการยืมนี้" };

  const isBorrower = order.borrowerId === user.id;
  const isOffice   = user.role === "PATTARA" || user.role === "ADMIN";
  if (!isBorrower && !isOffice) return { ok: false, error: "คุณไม่มีสิทธิ์เข้าถึงรายการนี้" };

  return { ok: true, order, isBorrower, isOffice };
}

// ─── 1. Student asks to borrow ────────────────────────────────────────────────

const RequestSchema = z.object({
  itemId:      z.string().min(1),
  days:        z.number().int().min(MIN_BORROW_DAYS).max(MAX_BORROW_DAYS),
  purposeNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function requestBorrow(input: z.infer<typeof RequestSchema>): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const blocked = borrowBlockReason(user.role);
    if (blocked) return { success: false, error: blocked };

    const parsed = RequestSchema.parse(input);

    // Anyone with an account may borrow — there is no eligibility test here on
    // purpose. The only bar is standing: unreturned items and a suspension.
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { borrowSuspendedUntil: true, lendingTier: true },
    });
    if (me?.borrowSuspendedUntil && me.borrowSuspendedUntil > new Date()) {
      return {
        success: false,
        error: "สิทธิ์การยืมของคุณถูกระงับชั่วคราว กรุณาคืนอุปกรณ์ที่ค้างอยู่ก่อน",
      };
    }
    if (me?.lendingTier === "BANNED") {
      return { success: false, error: "สิทธิ์การยืมของคุณถูกระงับถาวร กรุณาติดต่องานภัทร" };
    }

    const openCount = await prisma.lendingOrder.count({
      where: { borrowerId: user.id, status: { in: [...OPEN_STATUSES] as LendingOrderStatus[] } },
    });
    if (openCount >= MAX_CONCURRENT_BORROWS) {
      return {
        success: false,
        error: `ยืมพร้อมกันได้สูงสุด ${MAX_CONCURRENT_BORROWS} ชิ้น กรุณาคืนของที่ยืมอยู่ก่อน`,
      };
    }

    const item = await prisma.lendingItem.findUnique({
      where: { id: parsed.itemId },
      select: {
        id: true, title: true, status: true, ownerId: true,
        maxLendingDays: true, minLendingDays: true, meetupLocations: true,
      },
    });
    if (!item) return { success: false, error: "ไม่พบอุปกรณ์นี้" };
    if (item.status !== "AVAILABLE") {
      return { success: false, error: "อุปกรณ์ชิ้นนี้ไม่ว่างในขณะนี้" };
    }
    if (parsed.days > item.maxLendingDays) {
      return { success: false, error: `อุปกรณ์ชิ้นนี้ยืมได้ไม่เกิน ${item.maxLendingDays} วัน` };
    }
    if (parsed.days < item.minLendingDays) {
      return { success: false, error: `อุปกรณ์ชิ้นนี้ต้องยืมอย่างน้อย ${item.minLendingDays} วัน` };
    }

    const now = new Date();

    // Serializable: two students hitting "ขอยืม" on the last calculator at the
    // same moment must not both get it.
    const order = await prisma.$transaction(async (tx) => {
      const fresh = await tx.lendingItem.findUnique({
        where: { id: item.id }, select: { status: true },
      });
      if (!fresh || fresh.status !== "AVAILABLE") {
        throw new Error("อุปกรณ์ชิ้นนี้เพิ่งถูกขอยืมไปแล้ว");
      }

      await tx.lendingItem.update({ where: { id: item.id }, data: { status: "RESERVED" } });

      return tx.lendingOrder.create({
        data: {
          borrowerId:    user.id,
          lenderId:      item.ownerId,
          lendingItemId: item.id,
          requestedDays: parsed.days,
          purposeNote:   parsed.purposeNote || null,
          status:        "REQUESTED",
          requestedAt:   now,
          meetupLocation: item.meetupLocations[0] ?? null,
          statusHistory: [{
            status: "REQUESTED",
            changedAt: now.toISOString(),
            note: `ขอยืม ${parsed.days} วัน`,
          }],
        },
        select: { id: true },
      });
    }, { isolationLevel: "Serializable" });

    await prisma.notification.create({
      data: {
        userId:  item.ownerId,
        type:    "BORROW",
        message: `มีคำขอยืม "${item.title}" จาก ${user.name ?? "นักศึกษา"} — รอการอนุมัติ`,
        link:    "/pattara/requests",
      },
    }).catch(() => {});

    revalidatePath("/borrow");
    revalidatePath("/dashboard/borrows");
    return { success: true, message: "ส่งคำขอยืมแล้ว รอเจ้าหน้าที่อนุมัติ", id: order.id };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0].message };
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── 2. Office approves or rejects ───────────────────────────────────────────

export async function approveBorrow(
  orderId: string,
  opts: { pickupAt?: string; location?: string; staffNote?: string } = {},
): Promise<ActionResult> {
  try {
    const staff = await requireOffice();

    const order = await prisma.lendingOrder.findUnique({
      where: { id: orderId },
      include: { lendingItem: { select: { id: true, title: true } } },
    });
    if (!order) return { success: false, error: "ไม่พบรายการนี้" };
    if (order.status !== "REQUESTED") {
      return { success: false, error: "รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ" };
    }

    const pickupAt = opts.pickupAt ? new Date(opts.pickupAt) : null;
    const nextStatus: LendingOrderStatus = pickupAt ? "PICKUP_SCHEDULED" : "APPROVED";

    await prisma.lendingOrder.update({
      where: { id: orderId },
      data: {
        status:            nextStatus,
        approvedAt:        new Date(),
        approvedById:      staff.id,
        scheduledPickupAt: pickupAt,
        meetupLocation:    opts.location?.trim() || order.meetupLocation,
        staffNote:         opts.staffNote?.trim() || order.staffNote,
        statusHistory: pushHistory(order.statusHistory, {
          status: nextStatus,
          note: pickupAt
            ? `อนุมัติแล้ว · นัดรับ ${pickupAt.toLocaleString("th-TH")}`
            : "อนุมัติแล้ว รอนัดวันรับของ",
          by: staff.name ?? "เจ้าหน้าที่",
        }) as never,
      },
    });

    await prisma.notification.create({
      data: {
        userId:  order.borrowerId,
        type:    "BORROW",
        message: `คำขอยืม "${order.lendingItem.title}" ได้รับการอนุมัติแล้ว` +
                 (pickupAt ? ` — นัดรับ ${pickupAt.toLocaleString("th-TH")}` : " กรุณาติดต่อนัดรับของ"),
        link:    `/borrow/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath("/pattara/requests");
    revalidatePath("/pattara/orders");
    revalidatePath("/dashboard/borrows");
    return { success: true, message: "อนุมัติคำขอแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function rejectBorrow(orderId: string, reason: string): Promise<ActionResult> {
  try {
    const staff = await requireOffice();
    if (!reason.trim()) return { success: false, error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" };

    const order = await prisma.lendingOrder.findUnique({
      where: { id: orderId },
      include: { lendingItem: { select: { id: true, title: true } } },
    });
    if (!order) return { success: false, error: "ไม่พบรายการนี้" };
    if (order.status !== "REQUESTED") {
      return { success: false, error: "รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ" };
    }

    await prisma.$transaction([
      prisma.lendingOrder.update({
        where: { id: orderId },
        data: {
          status:       "REJECTED",
          cancelReason: reason.trim(),
          cancelledAt:  new Date(),
          cancelledBy:  staff.id,
          approvedById: staff.id,
          statusHistory: pushHistory(order.statusHistory, {
            status: "REJECTED", note: reason.trim(), by: staff.name ?? "เจ้าหน้าที่",
          }) as never,
        },
      }),
      // Straight back on the shelf — nobody should wait on a refusal.
      prisma.lendingItem.update({
        where: { id: order.lendingItemId }, data: { status: "AVAILABLE" },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId:  order.borrowerId,
        type:    "BORROW",
        message: `คำขอยืม "${order.lendingItem.title}" ไม่ได้รับการอนุมัติ — ${reason.trim()}`,
        link:    "/borrow",
      },
    }).catch(() => {});

    revalidatePath("/pattara/requests");
    revalidatePath("/borrow");
    revalidatePath("/dashboard/borrows");
    return { success: true, message: "ปฏิเสธคำขอแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── 3. Schedule the handover ────────────────────────────────────────────────

export async function scheduleBorrowPickup(
  orderId: string,
  pickupAt: string,
  location: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order } = res;

    if (!["APPROVED", "PICKUP_SCHEDULED"].includes(order.status)) {
      return { success: false, error: "รายการนี้ยังนัดรับไม่ได้" };
    }
    if (!location.trim()) return { success: false, error: "กรุณาระบุจุดนัดรับ" };

    const when = new Date(pickupAt);
    if (Number.isNaN(when.getTime())) return { success: false, error: "วันเวลาไม่ถูกต้อง" };

    await prisma.lendingOrder.update({
      where: { id: orderId },
      data: {
        status:            "PICKUP_SCHEDULED",
        scheduledPickupAt: when,
        meetupLocation:    location.trim(),
        statusHistory: pushHistory(order.statusHistory, {
          status: "PICKUP_SCHEDULED",
          note: `นัดรับ ${when.toLocaleString("th-TH")} ที่ ${location.trim()}`,
          by: user.name ?? "",
        }) as never,
      },
    });

    const other = user.id === order.borrowerId ? order.lenderId : order.borrowerId;
    await prisma.notification.create({
      data: {
        userId:  other,
        type:    "BORROW",
        message: `นัดรับ "${order.lendingItem.title}" — ${when.toLocaleString("th-TH")} ที่ ${location.trim()}`,
        link:    `/borrow/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/dashboard/borrows");
    revalidatePath("/pattara/orders");
    return { success: true, message: "บันทึกการนัดรับแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── 4. Handover — both sides confirm ────────────────────────────────────────

export async function confirmBorrowPickup(
  orderId: string,
  photos: string[] = [],
  note?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order, isBorrower } = res;

    // ITEM_HANDED_OVER belongs here: it is the state after the *first* side
    // confirms, and the second side still has to.
    if (!["APPROVED", "PICKUP_SCHEDULED", "ITEM_HANDED_OVER"].includes(order.status)) {
      return { success: false, error: "รายการนี้ยังยืนยันการรับของไม่ได้" };
    }

    const borrowerConfirm = isBorrower ? true : order.pickupBorrowerConfirm;
    const lenderConfirm   = isBorrower ? order.pickupLenderConfirm : true;
    const both = borrowerConfirm && lenderConfirm;

    // Photographs are the only record of what condition the thing was in. The
    // office side is required to take at least one, because it is the side that
    // will be asked to prove it later.
    if (!isBorrower && photos.length === 0 && order.pickupPhotos.length === 0) {
      return { success: false, error: "กรุณาถ่ายรูปสภาพอุปกรณ์อย่างน้อย 1 รูปก่อนส่งมอบ" };
    }

    const now = new Date();
    const due = new Date(now.getTime() + order.requestedDays * 86_400_000);

    await prisma.$transaction(async (tx) => {
      await tx.lendingOrder.update({
        where: { id: orderId },
        data: {
          pickupBorrowerConfirm: borrowerConfirm,
          pickupLenderConfirm:   lenderConfirm,
          pickupPhotos:          [...order.pickupPhotos, ...photos],
          pickupNote:            note?.trim() || order.pickupNote,
          ...(both
            ? {
                status:         "ACTIVE" as LendingOrderStatus,
                actualPickupAt: now,
                dueDate:        due,
                statusHistory: pushHistory(order.statusHistory, {
                  status: "ACTIVE",
                  note: `ยืนยันรับของทั้งสองฝ่าย · กำหนดคืน ${due.toLocaleDateString("th-TH")}`,
                }) as never,
              }
            : {
                status: "ITEM_HANDED_OVER" as LendingOrderStatus,
                statusHistory: pushHistory(order.statusHistory, {
                  status: "ITEM_HANDED_OVER",
                  note: isBorrower ? "ผู้ยืมยืนยันรับของแล้ว รออีกฝ่าย" : "เจ้าหน้าที่ยืนยันส่งมอบแล้ว รอผู้ยืม",
                  by: user.name ?? "",
                }) as never,
              }),
        },
      });

      if (both) {
        await tx.lendingItem.update({
          where: { id: order.lendingItemId },
          data: { status: "LENT_OUT", totalLentCount: { increment: 1 } },
        });
      }
    });

    if (both) {
      await prisma.notification.create({
        data: {
          userId:  order.borrowerId,
          type:    "BORROW",
          message: `รับ "${order.lendingItem.title}" เรียบร้อยแล้ว — กรุณาคืนภายใน ${due.toLocaleDateString("th-TH")}`,
          link:    `/borrow/orders/${orderId}`,
        },
      }).catch(() => {});
    }

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/dashboard/borrows");
    revalidatePath("/pattara/orders");
    return {
      success: true,
      message: both ? "ส่งมอบเรียบร้อย เริ่มนับระยะเวลายืมแล้ว" : "บันทึกการยืนยันแล้ว รออีกฝ่ายยืนยัน",
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── 5. Renewal ──────────────────────────────────────────────────────────────

export async function requestRenewal(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order, isBorrower } = res;

    if (!isBorrower) return { success: false, error: "เฉพาะผู้ยืมเท่านั้นที่ขอต่ออายุได้" };
    if (!["ACTIVE", "RENEWED"].includes(order.status)) {
      return { success: false, error: "รายการนี้ยังต่ออายุไม่ได้" };
    }
    if (!order.lendingItem.isRenewable) {
      return { success: false, error: "อุปกรณ์ชิ้นนี้ไม่อนุญาตให้ต่ออายุ" };
    }

    const cap = Math.min(order.lendingItem.maxRenewals, MAX_RENEWALS);
    if (order.renewalCount >= cap) {
      return { success: false, error: `ต่ออายุได้สูงสุด ${cap} ครั้ง` };
    }

    await prisma.lendingOrder.update({
      where: { id: orderId },
      data: {
        status: "RENEWAL_REQUESTED",
        statusHistory: pushHistory(order.statusHistory, {
          status: "RENEWAL_REQUESTED", note: `ขอต่ออายุอีก ${RENEWAL_DAYS} วัน`,
        }) as never,
      },
    });

    await prisma.notification.create({
      data: {
        userId:  order.lenderId,
        type:    "BORROW",
        message: `${user.name ?? "ผู้ยืม"} ขอต่ออายุการยืม "${order.lendingItem.title}"`,
        link:    `/pattara/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/dashboard/borrows");
    return { success: true, message: "ส่งคำขอต่ออายุแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function decideRenewal(orderId: string, approve: boolean): Promise<ActionResult> {
  try {
    const staff = await requireOffice();

    const order = await prisma.lendingOrder.findUnique({
      where: { id: orderId },
      include: { lendingItem: { select: { title: true } } },
    });
    if (!order) return { success: false, error: "ไม่พบรายการนี้" };
    if (order.status !== "RENEWAL_REQUESTED") {
      return { success: false, error: "ไม่มีคำขอต่ออายุที่รออยู่" };
    }

    const base   = order.dueDate ?? new Date();
    const newDue = new Date(base.getTime() + RENEWAL_DAYS * 86_400_000);

    await prisma.lendingOrder.update({
      where: { id: orderId },
      data: approve
        ? {
            status:          "RENEWED",
            originalDueDate: order.originalDueDate ?? order.dueDate,
            dueDate:         newDue,
            renewalCount:    { increment: 1 },
            renewalHistory:  [
              ...(Array.isArray(order.renewalHistory) ? order.renewalHistory : []),
              { at: new Date().toISOString(), newDueDate: newDue.toISOString(), by: staff.id },
            ] as never,
            statusHistory: pushHistory(order.statusHistory, {
              status: "RENEWED",
              note: `ต่ออายุถึง ${newDue.toLocaleDateString("th-TH")}`,
              by: staff.name ?? "เจ้าหน้าที่",
            }) as never,
          }
        : {
            status: "ACTIVE",
            statusHistory: pushHistory(order.statusHistory, {
              status: "ACTIVE", note: "ไม่อนุมัติการต่ออายุ", by: staff.name ?? "เจ้าหน้าที่",
            }) as never,
          },
    });

    await prisma.notification.create({
      data: {
        userId:  order.borrowerId,
        type:    "BORROW",
        message: approve
          ? `ต่ออายุการยืม "${order.lendingItem.title}" แล้ว — กำหนดคืนใหม่ ${newDue.toLocaleDateString("th-TH")}`
          : `คำขอต่ออายุ "${order.lendingItem.title}" ไม่ได้รับการอนุมัติ กรุณาคืนตามกำหนดเดิม`,
        link:    `/borrow/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/pattara/orders");
    revalidatePath("/dashboard/borrows");
    return { success: true, message: approve ? "ต่ออายุแล้ว" : "ปฏิเสธการต่ออายุแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── 6. Return ───────────────────────────────────────────────────────────────

export async function requestReturn(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order } = res;

    if (!["ACTIVE", "RENEWED", "OVERDUE"].includes(order.status)) {
      return { success: false, error: "รายการนี้ยังแจ้งคืนไม่ได้" };
    }

    await prisma.lendingOrder.update({
      where: { id: orderId },
      data: {
        status:            "RETURN_REQUESTED",
        returnRequestedAt: new Date(),
        statusHistory: pushHistory(order.statusHistory, {
          status: "RETURN_REQUESTED", note: "ผู้ยืมแจ้งต้องการคืนของ",
        }) as never,
      },
    });

    await prisma.notification.create({
      data: {
        userId:  order.lenderId,
        type:    "BORROW",
        message: `${user.name ?? "ผู้ยืม"} แจ้งคืน "${order.lendingItem.title}" — กรุณานัดวันรับคืน`,
        link:    `/pattara/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/dashboard/borrows");
    revalidatePath("/pattara/orders");
    return { success: true, message: "แจ้งคืนแล้ว รอเจ้าหน้าที่นัดวันรับคืน" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function scheduleReturn(
  orderId: string,
  returnAt: string,
  location: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order } = res;

    if (!["RETURN_REQUESTED", "RETURN_SCHEDULED", "ACTIVE", "RENEWED", "OVERDUE"].includes(order.status)) {
      return { success: false, error: "รายการนี้ยังนัดคืนไม่ได้" };
    }
    if (!location.trim()) return { success: false, error: "กรุณาระบุจุดนัดคืน" };

    const when = new Date(returnAt);
    if (Number.isNaN(when.getTime())) return { success: false, error: "วันเวลาไม่ถูกต้อง" };

    await prisma.lendingOrder.update({
      where: { id: orderId },
      data: {
        status:            "RETURN_SCHEDULED",
        scheduledReturnAt: when,
        meetupLocation:    location.trim(),
        statusHistory: pushHistory(order.statusHistory, {
          status: "RETURN_SCHEDULED",
          note: `นัดคืน ${when.toLocaleString("th-TH")} ที่ ${location.trim()}`,
          by: user.name ?? "",
        }) as never,
      },
    });

    const other = user.id === order.borrowerId ? order.lenderId : order.borrowerId;
    await prisma.notification.create({
      data: {
        userId:  other,
        type:    "BORROW",
        message: `นัดคืน "${order.lendingItem.title}" — ${when.toLocaleString("th-TH")} ที่ ${location.trim()}`,
        link:    `/borrow/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/dashboard/borrows");
    revalidatePath("/pattara/orders");
    return { success: true, message: "บันทึกการนัดคืนแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

/**
 * Closes the loop.
 *
 * When both sides have confirmed, the item goes back on the shelf and the
 * borrower's standing is settled. There is no deduction to calculate because
 * there was never a deposit — damage is recorded, and what to do about it is a
 * decision a person makes, not the system.
 */
export async function confirmReturn(
  orderId: string,
  opts: { photos?: string[]; condition?: string; note?: string } = {},
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order, isBorrower } = res;

    if (!["RETURN_REQUESTED", "RETURN_SCHEDULED", "RETURNED", "ACTIVE", "RENEWED", "OVERDUE"].includes(order.status)) {
      return { success: false, error: "รายการนี้ยังยืนยันการคืนไม่ได้" };
    }

    const photos = opts.photos ?? [];
    if (!isBorrower && photos.length === 0 && order.returnPhotos.length === 0) {
      return { success: false, error: "กรุณาถ่ายรูปสภาพอุปกรณ์ตอนรับคืนอย่างน้อย 1 รูป" };
    }

    const borrowerConfirm = isBorrower ? true : order.returnBorrowerConfirm;
    const lenderConfirm   = isBorrower ? order.returnLenderConfirm : true;
    const both = borrowerConfirm && lenderConfirm;

    const damaged  = opts.condition === "NEEDS_REPAIR" || opts.condition === "FAIR";
    const now      = new Date();
    const wasLate  = !!order.dueDate && now > order.dueDate;

    await prisma.$transaction(async (tx) => {
      await tx.lendingOrder.update({
        where: { id: orderId },
        data: {
          returnBorrowerConfirm: borrowerConfirm,
          returnLenderConfirm:   lenderConfirm,
          returnPhotos:          [...order.returnPhotos, ...photos],
          returnNote:            opts.note?.trim() || order.returnNote,
          returnCondition:       (opts.condition as ItemCondition) ?? order.returnCondition,
          ...(both
            ? {
                status:         (damaged ? "COMPLETED_WITH_DEDUCTION" : "COMPLETED") as LendingOrderStatus,
                actualReturnAt: now,
                completedAt:    now,
                statusHistory: pushHistory(order.statusHistory, {
                  status: damaged ? "COMPLETED_WITH_DEDUCTION" : "COMPLETED",
                  note: damaged
                    ? "รับคืนแล้ว — บันทึกสภาพชำรุด ไม่มีการเรียกเก็บเงิน"
                    : "รับคืนเรียบร้อย ปิดรายการ",
                }) as never,
              }
            : {
                status: "RETURNED" as LendingOrderStatus,
                statusHistory: pushHistory(order.statusHistory, {
                  status: "RETURNED",
                  note: isBorrower ? "ผู้ยืมยืนยันคืนแล้ว รอเจ้าหน้าที่ตรวจรับ" : "เจ้าหน้าที่รับคืนแล้ว รอผู้ยืมยืนยัน",
                  by: user.name ?? "",
                }) as never,
              }),
        },
      });

      if (both) {
        await tx.lendingItem.update({
          where: { id: order.lendingItemId },
          data: {
            status:    damaged ? "UNAVAILABLE" : "AVAILABLE",
            condition: (opts.condition as ItemCondition) ?? undefined,
          },
        });

        // Returning on time is the behaviour worth rewarding, and it is also
        // how somebody works their way back from a suspension.
        if (!wasLate) {
          await tx.user.update({
            where: { id: order.borrowerId },
            data: {
              trustScore: { increment: ON_TIME_TRUST_REWARD },
              borrowSuspendedUntil: null,
            },
          });
        } else {
          await tx.user.update({
            where: { id: order.borrowerId },
            data: { borrowSuspendedUntil: null },
          });
        }
      }
    });

    if (both) {
      await prisma.notification.create({
        data: {
          userId:  order.borrowerId,
          type:    "BORROW",
          message: damaged
            ? `รับคืน "${order.lendingItem.title}" แล้ว — เจ้าหน้าที่บันทึกว่ามีความเสียหาย ไม่มีค่าปรับ`
            : `รับคืน "${order.lendingItem.title}" เรียบร้อยแล้ว ขอบคุณที่คืนตรงเวลา`,
          link:    `/borrow/orders/${orderId}`,
        },
      }).catch(() => {});
    }

    revalidatePath(`/borrow/orders/${orderId}`);
    revalidatePath("/dashboard/borrows");
    revalidatePath("/pattara/orders");
    revalidatePath("/borrow");
    return {
      success: true,
      message: both ? "ปิดรายการเรียบร้อยแล้ว" : "บันทึกการยืนยันแล้ว รออีกฝ่ายยืนยัน",
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── 7. Cancel, and the endings nobody wants ─────────────────────────────────

export async function cancelBorrow(orderId: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const res  = await loadForParty(orderId, user);
    if (!res.ok) return { success: false, error: res.error };
    const { order } = res;

    if (!["REQUESTED", "APPROVED", "PICKUP_SCHEDULED"].includes(order.status)) {
      return { success: false, error: "ยกเลิกได้เฉพาะก่อนรับของเท่านั้น" };
    }

    await prisma.$transaction([
      prisma.lendingOrder.update({
        where: { id: orderId },
        data: {
          status:       "CANCELLED",
          cancelledAt:  new Date(),
          cancelledBy:  user.id,
          cancelReason: reason.trim() || "ยกเลิกโดยผู้ใช้",
          statusHistory: pushHistory(order.statusHistory, {
            status: "CANCELLED", note: reason.trim() || "ยกเลิก", by: user.name ?? "",
          }) as never,
        },
      }),
      prisma.lendingItem.update({
        where: { id: order.lendingItemId }, data: { status: "AVAILABLE" },
      }),
    ]);

    const other = user.id === order.borrowerId ? order.lenderId : order.borrowerId;
    await prisma.notification.create({
      data: {
        userId:  other,
        type:    "BORROW",
        message: `รายการยืม "${order.lendingItem.title}" ถูกยกเลิก — ${reason.trim() || "ไม่ระบุเหตุผล"}`,
        link:    `/borrow/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath("/dashboard/borrows");
    revalidatePath("/pattara/orders");
    revalidatePath("/borrow");
    return { success: true, message: "ยกเลิกรายการแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

/**
 * Marks an item as gone.
 *
 * The system stops here on purpose. What happens next — a replacement, a word
 * with the student affairs office, nothing at all — is a judgement about a
 * person's circumstances, and no rule written in advance gets that right.
 */
export async function markBorrowLost(orderId: string, note: string): Promise<ActionResult> {
  try {
    const staff = await requireOffice();

    const order = await prisma.lendingOrder.findUnique({
      where: { id: orderId },
      include: { lendingItem: { select: { id: true, title: true } } },
    });
    if (!order) return { success: false, error: "ไม่พบรายการนี้" };
    if (!note.trim()) return { success: false, error: "กรุณาบันทึกรายละเอียด" };

    await prisma.$transaction([
      prisma.lendingOrder.update({
        where: { id: orderId },
        data: {
          status:    "LOST",
          staffNote: note.trim(),
          statusHistory: pushHistory(order.statusHistory, {
            status: "LOST", note: note.trim(), by: staff.name ?? "เจ้าหน้าที่",
          }) as never,
        },
      }),
      prisma.lendingItem.update({
        where: { id: order.lendingItemId }, data: { status: "UNAVAILABLE" },
      }),
      prisma.user.update({
        where: { id: order.borrowerId },
        data: { lendingTier: "RESTRICTED" },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId:  order.borrowerId,
        type:    "BORROW",
        message: `"${order.lendingItem.title}" ถูกบันทึกว่าสูญหาย กรุณาติดต่องานภัทรโดยด่วน`,
        link:    `/borrow/orders/${orderId}`,
      },
    }).catch(() => {});

    revalidatePath("/pattara/orders");
    return { success: true, message: "บันทึกว่าสูญหายแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getMyBorrows() {
  const user = await requireUser();

  const orders = await prisma.lendingOrder.findMany({
    where: { borrowerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lendingItem: { select: { id: true, title: true, images: true, category: true, isRenewable: true, maxRenewals: true } },
      lender: { select: { officeName: true, name: true, officeLocation: true } },
    },
  });

  return orders.map(serialiseOrder);
}

export async function getBorrowOrder(orderId: string) {
  const user = await requireUser();
  const res  = await loadForParty(orderId, user);
  if (!res.ok) return null;

  const full = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: {
      lendingItem: {
        select: {
          id: true, title: true, images: true, category: true, condition: true,
          assetTag: true, isRenewable: true, maxRenewals: true,
        },
      },
      borrower:   { select: { id: true, name: true, email: true, image: true, trustScore: true } },
      lender:     { select: { id: true, name: true, officeName: true, officeLocation: true, officeHours: true } },
      approvedBy: { select: { name: true } },
    },
  });
  if (!full) return null;

  return {
    ...serialiseOrder(full),
    borrower: full.borrower,
    approvedByName: full.approvedBy?.name ?? null,
    // The reason a student gave is private to them and the office.
    purposeNote: res.isBorrower || res.isOffice ? full.purposeNote : null,
    staffNote:   res.isOffice ? full.staffNote : null,
    viewerIsBorrower: res.isBorrower,
    viewerIsOffice:   res.isOffice,
  };
}

/** Everything the office needs to see, with an optional status filter. */
export async function getOfficeOrders(filter?: string) {
  await requireOffice();

  const GROUPS: Record<string, LendingOrderStatus[]> = {
    waiting: ["REQUESTED"],
    active:  ["APPROVED", "PICKUP_SCHEDULED", "ITEM_HANDED_OVER", "ACTIVE", "RENEWED", "RENEWAL_REQUESTED", "RETURN_REQUESTED", "RETURN_SCHEDULED", "RETURNED"],
    overdue: ["OVERDUE", "LOST"],
    done:    ["COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED", "CANCELLED"],
  };

  const orders = await prisma.lendingOrder.findMany({
    where: filter && GROUPS[filter] ? { status: { in: GROUPS[filter] } } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      lendingItem: { select: { id: true, title: true, images: true, category: true, isRenewable: true, maxRenewals: true } },
      borrower:    { select: { id: true, name: true, email: true, trustScore: true } },
      lender:      { select: { officeName: true, name: true, officeLocation: true } },
    },
  });

  return orders.map((o) => ({ ...serialiseOrder(o), borrower: o.borrower }));
}

export async function getOfficeStats() {
  await requireOffice();

  const [items, available, lentOut, waiting, overdue, completed] = await Promise.all([
    prisma.lendingItem.count(),
    prisma.lendingItem.count({ where: { status: "AVAILABLE" } }),
    prisma.lendingItem.count({ where: { status: "LENT_OUT" } }),
    prisma.lendingOrder.count({ where: { status: "REQUESTED" } }),
    prisma.lendingOrder.count({ where: { status: { in: ["OVERDUE", "LOST"] } } }),
    prisma.lendingOrder.count({ where: { status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] } } }),
  ]);

  return { items, available, lentOut, waiting, overdue, completed };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function serialiseOrder(o: any) {
  return {
    id:              o.id,
    refCode:         o.refCode,
    status:          o.status,
    requestedDays:   o.requestedDays,
    purposeNote:     o.purposeNote,
    staffNote:       o.staffNote,
    meetupLocation:  o.meetupLocation,
    renewalCount:    o.renewalCount,
    pickupPhotos:    o.pickupPhotos,
    returnPhotos:    o.returnPhotos,
    pickupNote:      o.pickupNote,
    returnNote:      o.returnNote,
    returnCondition: o.returnCondition,
    cancelReason:    o.cancelReason,
    pickupBorrowerConfirm: o.pickupBorrowerConfirm,
    pickupLenderConfirm:   o.pickupLenderConfirm,
    returnBorrowerConfirm: o.returnBorrowerConfirm,
    returnLenderConfirm:   o.returnLenderConfirm,
    requestedAt:       o.requestedAt?.toISOString()       ?? null,
    approvedAt:        o.approvedAt?.toISOString()        ?? null,
    scheduledPickupAt: o.scheduledPickupAt?.toISOString() ?? null,
    actualPickupAt:    o.actualPickupAt?.toISOString()    ?? null,
    dueDate:           o.dueDate?.toISOString()           ?? null,
    scheduledReturnAt: o.scheduledReturnAt?.toISOString() ?? null,
    actualReturnAt:    o.actualReturnAt?.toISOString()    ?? null,
    completedAt:       o.completedAt?.toISOString()       ?? null,
    createdAt:         o.createdAt.toISOString(),
    statusHistory:     Array.isArray(o.statusHistory) ? o.statusHistory : [],
    item:   o.lendingItem,
    office: o.lender ? {
      name:     o.lender.officeName ?? o.lender.name,
      location: o.lender.officeLocation ?? null,
      hours:    (o.lender as { officeHours?: string | null }).officeHours ?? null,
    } : null,
  };
}
