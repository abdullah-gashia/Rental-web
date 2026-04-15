"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { LendingOrderStatus, ItemCondition } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function calcRentalFee(
  rentalType: string,
  dailyRate: number | null,
  flatFee: number | null,
  days: number
): number {
  if (rentalType === "FREE") return 0;
  if (rentalType === "FLAT_FEE") return flatFee ?? 0;
  return (dailyRate ?? 0) * days; // DAILY_RATE
}

async function pushNotification(userId: string, message: string, link?: string) {
  await prisma.notification.create({
    data: { userId, type: "ORDER", message, link: link ?? null },
  });
}

function pushStatus(history: any[], status: string) {
  return [...history, { status, at: new Date().toISOString() }];
}

// ─── Request to borrow ────────────────────────────────────────────────────────

export async function requestLending(
  lendingItemId: string,
  days: number,
  meetupLocation?: string,
  meetupNote?: string
): Promise<{ success: true; orderId: string } | { success: false; error: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  // Load item
  const item = await prisma.lendingItem.findUnique({
    where: { id: lendingItemId },
    include: { owner: { select: { id: true, name: true, walletBalance: true, lendingTier: true } } },
  });

  if (!item) return { success: false, error: "ไม่พบรายการ" };
  if (item.status !== "AVAILABLE") return { success: false, error: "รายการนี้ไม่พร้อมให้ยืมในขณะนี้" };
  if (item.ownerId === user.id) return { success: false, error: "คุณไม่สามารถยืมของตัวเองได้" };
  if (days < item.minLendingDays) return { success: false, error: `ต้องยืมอย่างน้อย ${item.minLendingDays} วัน` };
  if (days > item.maxLendingDays) return { success: false, error: `ยืมได้สูงสุด ${item.maxLendingDays} วัน` };

  // Load borrower wallet
  const borrower = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { walletBalance: true, lendingTier: true },
  });

  const rentalFee = calcRentalFee(item.rentalType, item.dailyRate, item.flatFee, days);
  const platformFee = Math.round(rentalFee * 0.05 * 100) / 100;
  const totalPaid = item.depositAmount + rentalFee + platformFee;

  if (borrower.walletBalance < totalPaid)
    return { success: false, error: `ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ ฿${totalPaid.toLocaleString()})` };

  // Atomic deduction + order creation
  const order = await prisma.$transaction(async (tx) => {
    // Recheck inside transaction
    const locked = await tx.lendingItem.findUniqueOrThrow({ where: { id: lendingItemId } });
    if (locked.status !== "AVAILABLE") throw new Error("ไม่พร้อมให้ยืม");

    // Deduct from borrower
    await tx.user.update({
      where: { id: user.id },
      data: { walletBalance: { decrement: totalPaid } },
    });

    // Mark item reserved
    await tx.lendingItem.update({
      where: { id: lendingItemId },
      data: { status: "RESERVED" },
    });

    return tx.lendingOrder.create({
      data: {
        borrowerId: user.id,
        lenderId: item.ownerId,
        lendingItemId,
        rentalType: item.rentalType,
        dailyRate: item.dailyRate,
        flatFee: item.flatFee,
        depositAmount: item.depositAmount,
        requestedDays: days,
        estimatedRentalFee: rentalFee,
        platformFee,
        totalPaidByBorrower: totalPaid,
        meetupLocation: meetupLocation ?? null,
        meetupNote: meetupNote ?? null,
        status: "REQUESTED",
        statusHistory: pushStatus([], "REQUESTED"),
      },
    });
  });

  // Notify lender
  await pushNotification(
    item.ownerId,
    `📬 มีคำขอยืม "${item.title}" (${days} วัน) — กรุณาตอบรับหรือปฏิเสธภายใน 24 ชม.`,
    `/lending/orders/${order.id}`
  );

  revalidatePath(`/lending/${lendingItemId}`);
  revalidatePath("/dashboard/lending");

  return { success: true, orderId: order.id };
}

// ─── Lender: approve request ──────────────────────────────────────────────────

export async function approveLendingRequest(
  orderId: string,
  scheduledPickupAt: Date
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { title: true } } },
  });

  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.lenderId !== user.id) return { success: false, error: "คุณไม่มีสิทธิ์" };
  if (order.status !== "REQUESTED") return { success: false, error: "ไม่สามารถอนุมัติได้ในสถานะนี้" };

  await prisma.lendingOrder.update({
    where: { id: orderId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      scheduledPickupAt,
      statusHistory: pushStatus(order.statusHistory as any[], "APPROVED"),
    },
  });

  await pushNotification(
    order.borrowerId,
    `✅ คำขอยืม "${order.lendingItem.title}" ได้รับการอนุมัติแล้ว นัดรับของ: ${scheduledPickupAt.toLocaleDateString("th-TH")}`,
    `/lending/orders/${orderId}`
  );

  revalidatePath(`/lending/orders/${orderId}`);
  revalidatePath("/dashboard/lending");

  return { success: true };
}

// ─── Lender: reject request ───────────────────────────────────────────────────

export async function rejectLendingRequest(
  orderId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { id: true, title: true } } },
  });

  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.lenderId !== user.id) return { success: false, error: "คุณไม่มีสิทธิ์" };
  if (!["REQUESTED"].includes(order.status)) return { success: false, error: "ไม่สามารถปฏิเสธได้" };

  await prisma.$transaction(async (tx) => {
    // Refund borrower
    await tx.user.update({
      where: { id: order.borrowerId },
      data: { walletBalance: { increment: order.totalPaidByBorrower } },
    });
    // Free item
    await tx.lendingItem.update({
      where: { id: order.lendingItemId },
      data: { status: "AVAILABLE" },
    });
    // Update order
    await tx.lendingOrder.update({
      where: { id: orderId },
      data: {
        status: "REJECTED",
        cancelledAt: new Date(),
        cancelReason: reason,
        cancelledBy: user.id,
        statusHistory: pushStatus(order.statusHistory as any[], "REJECTED"),
      },
    });
  });

  await pushNotification(
    order.borrowerId,
    `❌ คำขอยืม "${order.lendingItem.title}" ถูกปฏิเสธ เหตุผล: ${reason} — เงินคืนแล้ว`,
    `/lending/orders/${orderId}`
  );

  revalidatePath(`/lending/orders/${orderId}`);
  revalidatePath(`/lending/${order.lendingItem.id}`);
  revalidatePath("/dashboard/lending");

  return { success: true };
}

// ─── Cancel (by borrower before pickup) ──────────────────────────────────────

export async function cancelLendingOrder(
  orderId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { id: true, title: true } } },
  });

  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.borrowerId !== user.id) return { success: false, error: "คุณไม่มีสิทธิ์" };

  const cancellableStatuses: LendingOrderStatus[] = ["REQUESTED", "APPROVED", "DEPOSIT_HELD"];
  if (!cancellableStatuses.includes(order.status))
    return { success: false, error: "ไม่สามารถยกเลิกได้ในสถานะนี้" };

  await prisma.$transaction(async (tx) => {
    // Refund borrower
    await tx.user.update({
      where: { id: order.borrowerId },
      data: { walletBalance: { increment: order.totalPaidByBorrower } },
    });
    // Free item
    await tx.lendingItem.update({
      where: { id: order.lendingItemId },
      data: { status: "AVAILABLE" },
    });
    await tx.lendingOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
        cancelledBy: user.id,
        statusHistory: pushStatus(order.statusHistory as any[], "CANCELLED"),
      },
    });
  });

  await pushNotification(
    order.lenderId,
    `🚫 ผู้ยืมยกเลิกคำขอยืม "${order.lendingItem.title}" — เหตุผล: ${reason}`,
    `/lending/orders/${orderId}`
  );

  revalidatePath(`/lending/orders/${orderId}`);
  revalidatePath("/dashboard/lending");

  return { success: true };
}

// ─── Digital Handshake — Pickup confirm ──────────────────────────────────────

export async function confirmPickup(
  orderId: string,
  photos: string[],
  note?: string
): Promise<{ success: boolean; error?: string; bothConfirmed?: boolean }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { id: true, title: true } } },
  });

  if (!order) return { success: false, error: "ไม่พบรายการ" };

  const isBorrower = order.borrowerId === user.id;
  const isLender = order.lenderId === user.id;
  if (!isBorrower && !isLender) return { success: false, error: "คุณไม่มีสิทธิ์" };

  if (!["APPROVED", "DEPOSIT_HELD", "PICKUP_SCHEDULED", "PICKUP_IN_PROGRESS"].includes(order.status))
    return { success: false, error: "ไม่สามารถยืนยันรับของได้ในสถานะนี้" };

  const update: any = {
    pickupPhotos: [...order.pickupPhotos, ...photos],
    pickupNote: note ?? order.pickupNote,
    status: "PICKUP_IN_PROGRESS",
  };

  if (isBorrower) update.pickupBorrowerConfirm = true;
  if (isLender) update.pickupLenderConfirm = true;

  const newBorrower = isBorrower ? true : order.pickupBorrowerConfirm;
  const newLender = isLender ? true : order.pickupLenderConfirm;
  const bothConfirmed = newBorrower && newLender;

  if (bothConfirmed) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + order.requestedDays);

    update.status = "ACTIVE";
    update.actualPickupAt = new Date();
    update.dueDate = dueDate;
    update.originalDueDate = dueDate;
    update.statusHistory = pushStatus(order.statusHistory as any[], "ACTIVE");

    // Mark item as LENT_OUT
    await prisma.lendingItem.update({
      where: { id: order.lendingItemId },
      data: { status: "LENT_OUT" },
    });

    await pushNotification(
      order.borrowerId,
      `🤝 ส่งมอบสำเร็จ! "${order.lendingItem.title}" — กำหนดคืน: ${dueDate.toLocaleDateString("th-TH")}`,
      `/lending/orders/${orderId}`
    );
    await pushNotification(
      order.lenderId,
      `🤝 ส่งมอบสำเร็จ! "${order.lendingItem.title}" กำลังถูกยืมอยู่`,
      `/lending/orders/${orderId}`
    );
  } else {
    // Notify the other party
    const otherUserId = isBorrower ? order.lenderId : order.borrowerId;
    const role = isBorrower ? "ผู้ยืม" : "เจ้าของ";
    await pushNotification(
      otherUserId,
      `⏳ ${role}ยืนยันรับ/ส่งของแล้ว — รอการยืนยันจากคุณ`,
      `/lending/orders/${orderId}`
    );
  }

  await prisma.lendingOrder.update({
    where: { id: orderId },
    data: update,
  });

  revalidatePath(`/lending/orders/${orderId}`);
  revalidatePath("/dashboard/lending");

  return { success: true, bothConfirmed };
}

// ─── Request return ───────────────────────────────────────────────────────────

export async function requestReturn(
  orderId: string,
  scheduledReturnAt: Date
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { title: true } } },
  });

  if (!order) return { success: false, error: "ไม่พบรายการ" };
  if (order.borrowerId !== user.id) return { success: false, error: "คุณไม่มีสิทธิ์" };
  if (!["ACTIVE", "OVERDUE"].includes(order.status))
    return { success: false, error: "ไม่สามารถแจ้งคืนได้ในสถานะนี้" };

  await prisma.lendingOrder.update({
    where: { id: orderId },
    data: {
      status: "RETURN_REQUESTED",
      returnRequestedAt: new Date(),
      scheduledReturnAt,
      statusHistory: pushStatus(order.statusHistory as any[], "RETURN_REQUESTED"),
    },
  });

  await pushNotification(
    order.lenderId,
    `📦 ผู้ยืมต้องการคืน "${order.lendingItem.title}" — นัดวันที่ ${scheduledReturnAt.toLocaleDateString("th-TH")}`,
    `/lending/orders/${orderId}`
  );

  revalidatePath(`/lending/orders/${orderId}`);

  return { success: true };
}

// ─── Digital Handshake — Return confirm ──────────────────────────────────────

export async function confirmReturn(
  orderId: string,
  photos: string[],
  note?: string,
  returnCondition?: ItemCondition,
  damageFeeRequested?: number
): Promise<{ success: boolean; error?: string; bothConfirmed?: boolean }> {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: { lendingItem: { select: { id: true, title: true, lateFeePerDay: true } } },
  });

  if (!order) return { success: false, error: "ไม่พบรายการ" };

  const isBorrower = order.borrowerId === user.id;
  const isLender = order.lenderId === user.id;
  if (!isBorrower && !isLender) return { success: false, error: "คุณไม่มีสิทธิ์" };

  if (!["RETURN_REQUESTED", "RETURN_SCHEDULED", "RETURN_IN_PROGRESS", "ACTIVE", "OVERDUE"].includes(order.status))
    return { success: false, error: "ไม่สามารถยืนยันคืนได้ในสถานะนี้" };

  const update: any = {
    returnPhotos: [...order.returnPhotos, ...photos],
    returnNote: note ?? order.returnNote,
    status: "RETURN_IN_PROGRESS",
  };

  if (isBorrower) update.returnBorrowerConfirm = true;
  if (isLender) {
    update.returnLenderConfirm = true;
    if (returnCondition) update.returnCondition = returnCondition;
    if (damageFeeRequested !== undefined) update.damageFeeRequested = damageFeeRequested;
  }

  const newBorrower = isBorrower ? true : order.returnBorrowerConfirm;
  const newLender = isLender ? true : order.returnLenderConfirm;
  const bothConfirmed = newBorrower && newLender;

  await prisma.lendingOrder.update({
    where: { id: orderId },
    data: update,
  });

  if (bothConfirmed) {
    await settleLendingOrder(orderId);
  } else {
    const otherUserId = isBorrower ? order.lenderId : order.borrowerId;
    await pushNotification(
      otherUserId,
      `⏳ ${isBorrower ? "ผู้ยืม" : "เจ้าของ"}ยืนยันคืนของแล้ว — รอการยืนยันจากคุณ`,
      `/lending/orders/${orderId}`
    );
  }

  revalidatePath(`/lending/orders/${orderId}`);
  revalidatePath("/dashboard/lending");

  return { success: true, bothConfirmed };
}

// ─── Settlement (called internally after both return-confirmed) ───────────────

export async function settleLendingOrder(orderId: string) {
  const order = await prisma.lendingOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { lendingItem: { select: { id: true, title: true, lateFeePerDay: true } } },
  });

  const now = new Date();
  const actualPickup = order.actualPickupAt ?? now;
  const actualDays = Math.max(1, Math.ceil((now.getTime() - actualPickup.getTime()) / (1000 * 60 * 60 * 24)));
  const requestedDays = order.requestedDays;

  // Recalculate actual rental fee
  let actualRentalFee = 0;
  if (order.rentalType === "DAILY_RATE") {
    actualRentalFee = (order.dailyRate ?? 0) * Math.min(actualDays, requestedDays);
  } else if (order.rentalType === "FLAT_FEE") {
    actualRentalFee = order.flatFee ?? 0;
  }

  // Late fees
  const overdueDays = Math.max(0, actualDays - requestedDays);
  const lateFees = overdueDays * (order.lendingItem.lateFeePerDay ?? 0);

  // Damage fees (requested by lender)
  const damageFees = Math.min(order.damageFeeRequested ?? 0, order.depositAmount);

  // Platform fee on rental only
  const platformFee = Math.round(actualRentalFee * 0.05 * 100) / 100;

  // Payouts
  const lenderPayout = actualRentalFee - platformFee + lateFees + damageFees;
  const depositRefund = order.depositAmount - damageFees;

  const hasDeduction = damageFees > 0 || lateFees > 0;
  const finalStatus: LendingOrderStatus = hasDeduction ? "COMPLETED_WITH_DEDUCTION" : "COMPLETED";

  await prisma.$transaction(async (tx) => {
    // Pay lender
    await tx.user.update({
      where: { id: order.lenderId },
      data: { walletBalance: { increment: lenderPayout } },
    });
    // Refund deposit to borrower
    if (depositRefund > 0) {
      await tx.user.update({
        where: { id: order.borrowerId },
        data: { walletBalance: { increment: depositRefund } },
      });
    }
    // Free the item
    await tx.lendingItem.update({
      where: { id: order.lendingItemId },
      data: {
        status: "AVAILABLE",
        totalLentCount: { increment: 1 },
      },
    });
    // Complete order
    await tx.lendingOrder.update({
      where: { id: orderId },
      data: {
        status: finalStatus,
        actualReturnAt: new Date(),
        completedAt: new Date(),
        actualRentalFee,
        lateFees,
        damageFees,
        platformFee,
        lenderPayout,
        statusHistory: pushStatus(order.statusHistory as any[], finalStatus),
      },
    });
  });

  // Notifications
  await pushNotification(
    order.borrowerId,
    `✅ คืน "${order.lendingItem.title}" เรียบร้อยแล้ว${depositRefund > 0 ? ` — มัดจำคืน ฿${depositRefund.toLocaleString()}` : ""}${damageFees > 0 ? ` (หักค่าเสียหาย ฿${damageFees.toLocaleString()})` : ""}`,
    `/lending/orders/${orderId}`
  );
  await pushNotification(
    order.lenderId,
    `✅ ได้รับคืน "${order.lendingItem.title}" — ค่าเช่า ฿${lenderPayout.toLocaleString()} เข้ากระเป๋าแล้ว`,
    `/lending/orders/${orderId}`
  );

  // Update lender tier
  await updateLendingTier(order.lenderId);
  await updateLendingTier(order.borrowerId);

  revalidatePath(`/lending/orders/${orderId}`);
  revalidatePath("/dashboard/lending");
}

// ─── Lending tier auto-update ─────────────────────────────────────────────────

async function updateLendingTier(userId: string) {
  const count = await prisma.lendingOrder.count({
    where: {
      OR: [{ borrowerId: userId }, { lenderId: userId }],
      status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] },
    },
  });

  let tier: "NEW_USER" | "STANDARD" | "TRUSTED" = "NEW_USER";
  if (count >= 10) tier = "TRUSTED";
  else if (count >= 3) tier = "STANDARD";

  await prisma.user.update({ where: { id: userId }, data: { lendingTier: tier } });
}

// ─── Get order detail ─────────────────────────────────────────────────────────

export async function getLendingOrderDetail(orderId: string) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return null;

  const order = await prisma.lendingOrder.findUnique({
    where: { id: orderId },
    include: {
      borrower: { select: { id: true, name: true, image: true, lendingTier: true, borrowerRating: true } },
      lender: { select: { id: true, name: true, image: true, lendingTier: true, lenderRating: true } },
      lendingItem: true,
    },
  });

  if (!order) return null;
  if (order.borrowerId !== user.id && order.lenderId !== user.id && user.role !== "ADMIN")
    return null;

  return {
    ...order,
    requestedAt: order.requestedAt.toISOString(),
    approvedAt: order.approvedAt?.toISOString() ?? null,
    scheduledPickupAt: order.scheduledPickupAt?.toISOString() ?? null,
    actualPickupAt: order.actualPickupAt?.toISOString() ?? null,
    dueDate: order.dueDate?.toISOString() ?? null,
    returnRequestedAt: order.returnRequestedAt?.toISOString() ?? null,
    scheduledReturnAt: order.scheduledReturnAt?.toISOString() ?? null,
    actualReturnAt: order.actualReturnAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    lendingItem: {
      ...order.lendingItem,
      createdAt: order.lendingItem.createdAt.toISOString(),
      updatedAt: order.lendingItem.updatedAt.toISOString(),
    },
    currentUserId: user.id,
    currentUserRole: order.borrowerId === user.id ? "BORROWER" : "LENDER",
  };
}

// ─── Get my dashboard orders ──────────────────────────────────────────────────

export async function getMyLendingDashboard() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) return { borrows: [], lends: [] };

  const [borrows, lends] = await Promise.all([
    prisma.lendingOrder.findMany({
      where: { borrowerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        lendingItem: { select: { id: true, title: true, images: true, category: true } },
        lender: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.lendingOrder.findMany({
      where: { lenderId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        lendingItem: { select: { id: true, title: true, images: true, category: true } },
        borrower: { select: { id: true, name: true, image: true } },
      },
    }),
  ]);

  const toISO = (o: any) => ({
    ...o,
    requestedAt: o.requestedAt.toISOString(),
    dueDate: o.dueDate?.toISOString() ?? null,
    completedAt: o.completedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
  });

  return { borrows: borrows.map(toISO), lends: lends.map(toISO) };
}

// Display label constants live in @/lib/constants/lending — import from there.
