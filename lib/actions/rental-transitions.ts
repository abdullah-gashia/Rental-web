"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ActionResult = { success: true } | { success: false; error: string };

function appendHistory(existing: any, status: string, note?: string) {
  const arr = Array.isArray(existing) ? existing : [];
  return [...arr, { status, changedAt: new Date().toISOString(), note: note ?? "" }];
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/rental/orders/${orderId}`);
  revalidatePath("/dashboard/rentals");
  revalidatePath("/dashboard");
}

// ─── Owner: Approve ───────────────────────────────────────────────────────────

export async function approveRentalOrder(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.ownerId !== session.user.id) return { success: false, error: "ไม่มีสิทธิ์" };
  if (order.status !== "REQUESTED") return { success: false, error: `สถานะไม่ถูกต้อง (${order.status})` };

  await prisma.rentalOrder.update({
    where: { id: orderId },
    data: {
      status: "APPROVED",
      statusHistory: appendHistory(order.statusHistory, "APPROVED", "เจ้าของตอบรับแล้ว"),
    },
  });

  // Notify renter
  try {
    await prisma.notification.create({
      data: {
        userId:  order.renterId,
        type:    "ORDER",
        message: `คำขอเช่าได้รับการตอบรับแล้ว! เจ้าของตอบรับคำขอเช่าของคุณแล้ว กรุณาไปนัดรับสินค้า`,
      },
    });
  } catch { /* non-critical */ }

  revalidateOrder(orderId);
  return { success: true };
}

// ─── Owner: Reject ────────────────────────────────────────────────────────────

export async function rejectRentalOrder(orderId: string, reason: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.ownerId !== session.user.id) return { success: false, error: "ไม่มีสิทธิ์" };
  if (!["REQUESTED", "APPROVED"].includes(order.status)) {
    return { success: false, error: `สถานะไม่ถูกต้อง (${order.status})` };
  }

  await prisma.$transaction(async (tx) => {
    // Refund wallet
    await tx.user.update({
      where: { id: order.renterId },
      data: { walletBalance: { increment: order.totalPaid } },
    });
    // Update order
    await tx.rentalOrder.update({
      where: { id: orderId },
      data: {
        status:       "REJECTED",
        cancelledAt:  new Date(),
        cancelledBy:  session.user!.id,
        cancelReason: reason,
        statusHistory: appendHistory(order.statusHistory, "REJECTED", reason),
      },
    });
    // Restore item
    await tx.item.update({ where: { id: order.itemId }, data: { status: "APPROVED" } });
  });

  try {
    await prisma.notification.create({
      data: {
        userId:  order.renterId,
        type:    "ORDER",
        message: `คำขอเช่าถูกปฏิเสธ — เงินถูกคืนเข้ากระเป๋าแล้ว`,
      },
    });
  } catch { /* non-critical */ }

  revalidateOrder(orderId);
  return { success: true };
}

// ─── Renter: Cancel ───────────────────────────────────────────────────────────

export async function cancelRentalOrder(orderId: string, reason: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.renterId !== session.user.id) return { success: false, error: "ไม่มีสิทธิ์" };
  if (!["REQUESTED", "APPROVED"].includes(order.status)) {
    return { success: false, error: "ไม่สามารถยกเลิกได้ในสถานะนี้" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: order.renterId },
      data: { walletBalance: { increment: order.totalPaid } },
    });
    await tx.rentalOrder.update({
      where: { id: orderId },
      data: {
        status:       "CANCELLED",
        cancelledAt:  new Date(),
        cancelledBy:  session.user!.id,
        cancelReason: reason,
        statusHistory: appendHistory(order.statusHistory, "CANCELLED", `ผู้เช่ายกเลิก: ${reason}`),
      },
    });
    await tx.item.update({ where: { id: order.itemId }, data: { status: "APPROVED" } });
  });

  revalidateOrder(orderId);
  return { success: true };
}

// ─── Pickup Confirm (Digital Handshake #1) ────────────────────────────────────

export async function confirmRentalPickup(
  orderId: string,
  photos: string[],
  conditionNote: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.renterId !== userId && order.ownerId !== userId) {
    return { success: false, error: "ไม่มีสิทธิ์" };
  }
  if (!["APPROVED", "PICKUP_SCHEDULED"].includes(order.status)) {
    return { success: false, error: "ไม่สามารถยืนยันการรับในสถานะนี้" };
  }

  const isRenter = order.renterId === userId;
  const update: Record<string, any> = {
    pickupPhotos: photos.length > 0 ? photos : order.pickupPhotos,
    pickupConditionNote: conditionNote || order.pickupConditionNote,
  };

  if (isRenter) update.pickupRenterConfirm = true;
  else          update.pickupOwnerConfirm  = true;

  // Check if both will have confirmed after this update
  const renterConfirmed = isRenter ? true : order.pickupRenterConfirm;
  const ownerConfirmed  = isRenter ? order.pickupOwnerConfirm : true;

  if (renterConfirmed && ownerConfirmed) {
    // Both confirmed — activate the rental
    update.status         = "ACTIVE";
    update.actualPickupAt = new Date();
    update.statusHistory  = appendHistory(order.statusHistory, "ACTIVE", "ทั้งสองฝ่ายยืนยันรับของแล้ว");
  } else {
    update.status        = "PICKUP_SCHEDULED";
    update.statusHistory = appendHistory(
      order.statusHistory,
      "PICKUP_SCHEDULED",
      isRenter ? "ผู้เช่ายืนยันรับของแล้ว รอเจ้าของยืนยัน" : "เจ้าของยืนยันส่งของแล้ว รอผู้เช่ายืนยัน",
    );
  }

  await prisma.rentalOrder.update({ where: { id: orderId }, data: update });
  revalidateOrder(orderId);
  return { success: true };
}

// ─── Return Confirm (Digital Handshake #2) ────────────────────────────────────

export async function confirmRentalReturn(
  orderId: string,
  photos: string[],
  returnCondition: string,
  conditionNote: string,
  damageFeeRequested: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.renterId !== userId && order.ownerId !== userId) {
    return { success: false, error: "ไม่มีสิทธิ์" };
  }
  if (!["ACTIVE", "OVERDUE", "RETURN_SCHEDULED"].includes(order.status)) {
    return { success: false, error: "ไม่สามารถยืนยันการคืนในสถานะนี้" };
  }

  const isRenter = order.renterId === userId;
  const update: Record<string, any> = {};

  if (photos.length > 0) update.returnPhotos = photos;
  if (conditionNote)      update.returnConditionNote = conditionNote;
  if (returnCondition)    update.returnCondition = returnCondition;
  if (isRenter) {
    update.returnRenterConfirm = true;
    update.status = "RETURN_SCHEDULED";
    update.statusHistory = appendHistory(order.statusHistory, "RETURN_SCHEDULED", "ผู้เช่ายืนยันคืนของแล้ว รอเจ้าของตรวจสอบ");
  } else {
    update.returnOwnerConfirm = true;
    // Owner sets damage fee
    if (damageFeeRequested > 0) {
      update.damageFees = damageFeeRequested;
    }
  }

  const renterConfirmed = isRenter ? true : order.returnRenterConfirm;
  const ownerConfirmed  = isRenter ? order.returnOwnerConfirm : true;

  if (renterConfirmed && ownerConfirmed) {
    // Both confirmed — settle
    const settled = await settleRentalOrder(orderId, order, damageFeeRequested);
    if (!settled.success) return settled;
    return { success: true };
  }

  await prisma.rentalOrder.update({ where: { id: orderId }, data: update });
  revalidateOrder(orderId);
  return { success: true };
}

// ─── Settlement ───────────────────────────────────────────────────────────────

async function settleRentalOrder(
  orderId: string,
  order: any,
  extraDamageFees: number,
): Promise<ActionResult> {
  const damageFees   = Math.max(order.damageFees, extraDamageFees);
  const lateFees     = order.lateFees;
  const depositRefund = Math.max(0, order.securityDeposit - damageFees);
  const ownerPayout  = order.rentalFee - order.platformFee + lateFees + damageFees;
  const isLost       = order.returnCondition === "LOST";

  try {
    await prisma.$transaction(async (tx) => {
      // Pay owner
      await tx.user.update({
        where: { id: order.ownerId },
        data: { walletBalance: { increment: ownerPayout } },
      });

      // Refund deposit to renter (unless item lost)
      if (!isLost && depositRefund > 0) {
        await tx.user.update({
          where: { id: order.renterId },
          data: { walletBalance: { increment: depositRefund } },
        });
      }

      const finalStatus = isLost
        ? "ITEM_LOST"
        : damageFees > 0 ? "COMPLETED_WITH_DEDUCTION" : "COMPLETED";

      await tx.rentalOrder.update({
        where: { id: orderId },
        data: {
          status:          finalStatus,
          damageFees,
          depositRefund:   isLost ? 0 : depositRefund,
          ownerPayout,
          actualReturnDate: new Date(),
          completedAt:     new Date(),
          returnOwnerConfirm:  true,
          returnRenterConfirm: true,
          statusHistory: appendHistory(
            order.statusHistory,
            finalStatus,
            `จัดการเงินเรียบร้อย — เจ้าของได้รับ ฿${ownerPayout}, มัดจำคืน ฿${depositRefund}`,
          ),
        },
      });

      // Restore item to APPROVED
      await tx.item.update({ where: { id: order.itemId }, data: { status: "APPROVED" } });
    });

    // Notify both parties
    await Promise.allSettled([
      prisma.notification.create({
        data: {
          userId:  order.ownerId,
          type:    "ORDER",
          message: `การเช่าเสร็จสิ้น — คุณได้รับ ฿${ownerPayout.toLocaleString()} จากการเช่า`,
        },
      }),
      prisma.notification.create({
        data: {
          userId:  order.renterId,
          type:    "ORDER",
          message: depositRefund > 0
            ? `มัดจำ ฿${depositRefund.toLocaleString()} ถูกคืนเข้ากระเป๋าของคุณแล้ว`
            : "การเช่าเสร็จสิ้น — มัดจำถูกหักเต็มจำนวน",
        },
      }),
    ]);

    revalidateOrder(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "เกิดข้อผิดพลาดในการชำระเงิน" };
  }
}

// ─── Request Return (renter initiates) ───────────────────────────────────────

export async function requestRentalReturn(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const order = await prisma.rentalOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.renterId !== session.user.id) return { success: false, error: "ไม่มีสิทธิ์" };
  if (!["ACTIVE", "OVERDUE"].includes(order.status)) {
    return { success: false, error: "ไม่สามารถแจ้งคืนในสถานะนี้" };
  }

  await prisma.rentalOrder.update({
    where: { id: orderId },
    data: {
      status: "RETURN_SCHEDULED",
      statusHistory: appendHistory(order.statusHistory, "RETURN_SCHEDULED", "ผู้เช่าแจ้งต้องการคืนของ"),
    },
  });

  revalidateOrder(orderId);
  return { success: true };
}
