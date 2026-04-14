"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { EscrowStatus } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pushHistory(
  existing: unknown,
  status: string,
  userId: string,
  note: string
) {
  const history = Array.isArray(existing) ? existing : [];
  return [
    ...history,
    { status, changedAt: new Date().toISOString(), changedBy: userId, note },
  ];
}

// Valid transitions map
const VALID_TRANSITIONS: Record<string, EscrowStatus[]> = {
  // Escrow + Shipping
  FUNDS_HELD:            ["SHIPPED", "CANCELLED", "DISPUTED"],
  SHIPPED:               ["DELIVERED", "DISPUTED"],
  DELIVERED:             ["COMPLETED", "DISPUTED"],

  // Escrow + Meetup
  MEETUP_SCHEDULED:      ["MEETUP_COMPLETED", "CANCELLED", "DISPUTED"],
  MEETUP_COMPLETED:      ["COMPLETED"],

  // COD + Shipping
  AWAITING_SHIPMENT:     ["COD_SHIPPED", "CANCELLED"],
  COD_SHIPPED:           ["COD_DELIVERED", "DISPUTED"],
  COD_DELIVERED:         ["COMPLETED"],

  // COD + Meetup
  MEETUP_ARRANGED:       ["MEETUP_CASH_COMPLETED", "CANCELLED"],
  MEETUP_CASH_COMPLETED: ["COMPLETED"],

  // Legacy
  PENDING_CONFIRMATION:  ["FUNDS_HELD", "AWAITING_SHIPMENT", "CANCELLED"],
};

function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Confirm Shipment (Seller) ───────────────────────────────────────────────

export async function confirmShipmentNew(
  orderId: string,
  trackingNumber: string,
  trackingCarrier?: string,
  shippingProofImage?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "ไม่พบคำสั่งซื้อ" };
  if (order.sellerId !== userId) return { error: "ไม่มีสิทธิ์" };

  const targetStatus: EscrowStatus =
    order.status === "AWAITING_SHIPMENT" ? "COD_SHIPPED" : "SHIPPED";

  if (!canTransition(order.status, targetStatus)) {
    return { error: `ไม่สามารถเปลี่ยนสถานะจาก ${order.status} เป็น ${targetStatus}` };
  }

  await prisma.escrowOrder.update({
    where: { id: orderId },
    data: {
      status: targetStatus,
      trackingNumber,
      trackingCarrier: trackingCarrier || null,
      shippingProofImage: shippingProofImage || null,
      shippedAt: new Date(),
      statusHistory: pushHistory(order.statusHistory, targetStatus, userId, "จัดส่งสินค้าแล้ว"),
    },
  });

  // Notify buyer
  await prisma.notification.create({
    data: {
      userId: order.buyerId,
      type: "ORDER",
      message: `📦 สินค้าถูกจัดส่งแล้ว! เลขพัสดุ: ${trackingNumber}`,
      link: "/dashboard/orders",
    },
  });

  revalidatePath("/dashboard/orders");
  return { success: true };
}

// ─── Confirm Delivery / Receipt (Buyer) ──────────────────────────────────────

export async function confirmDelivery(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "ไม่พบคำสั่งซื้อ" };
  if (order.buyerId !== userId) return { error: "ไม่มีสิทธิ์" };

  let targetStatus: EscrowStatus;
  if (order.status === "SHIPPED") targetStatus = "DELIVERED";
  else if (order.status === "COD_SHIPPED") targetStatus = "COD_DELIVERED";
  else return { error: `ไม่สามารถยืนยันการรับสินค้าในสถานะ ${order.status}` };

  if (!canTransition(order.status, targetStatus)) {
    return { error: "ไม่สามารถเปลี่ยนสถานะได้" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.escrowOrder.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        deliveredAt: new Date(),
        statusHistory: pushHistory(order.statusHistory, targetStatus, userId, "ผู้ซื้อยืนยันรับสินค้า"),
      },
    });

    // If Escrow, release funds to seller
    if (order.paymentMethod === "ESCROW" || order.paymentMethod === null) {
      const payout = order.sellerPayout ?? order.amount;

      await tx.user.update({
        where: { id: order.sellerId },
        data: {
          escrowBalance: { decrement: order.totalAmount ?? order.amount },
          walletBalance: { increment: payout },
        },
      });

      await tx.escrowOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          statusHistory: pushHistory(
            pushHistory(order.statusHistory, targetStatus, userId, "ผู้ซื้อยืนยันรับสินค้า"),
            "COMPLETED",
            "system",
            "ปล่อยเงินให้ผู้ขายแล้ว"
          ),
        },
      });
    }
  });

  // Notify seller
  await prisma.notification.create({
    data: {
      userId: order.sellerId,
      type: "ORDER",
      message: `✅ ผู้ซื้อยืนยันรับสินค้าแล้ว${order.paymentMethod === "ESCROW" || !order.paymentMethod ? " — เงินโอนเข้ากระเป๋าแล้ว" : ""}`,
      link: "/dashboard/orders",
    },
  });

  revalidatePath("/dashboard/orders");
  return { success: true };
}

// ─── Confirm Meetup Complete (Either Party) ──────────────────────────────────

export async function confirmMeetupComplete(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "ไม่พบคำสั่งซื้อ" };

  const isParty = order.buyerId === userId || order.sellerId === userId;
  if (!isParty) return { error: "ไม่มีสิทธิ์" };

  let targetStatus: EscrowStatus;
  if (order.status === "MEETUP_SCHEDULED") targetStatus = "MEETUP_COMPLETED";
  else if (order.status === "MEETUP_ARRANGED") targetStatus = "MEETUP_CASH_COMPLETED";
  else return { error: `ไม่สามารถยืนยันนัดรับในสถานะ ${order.status}` };

  await prisma.$transaction(async (tx) => {
    await tx.escrowOrder.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        deliveredAt: new Date(),
        statusHistory: pushHistory(order.statusHistory, targetStatus, userId, "ยืนยันนัดรับสำเร็จ"),
      },
    });

    // If Escrow + Meetup, release funds
    if (targetStatus === "MEETUP_COMPLETED") {
      const payout = order.sellerPayout ?? order.amount;

      await tx.user.update({
        where: { id: order.sellerId },
        data: {
          escrowBalance: { decrement: order.totalAmount ?? order.amount },
          walletBalance: { increment: payout },
        },
      });

      await tx.escrowOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          statusHistory: pushHistory(
            pushHistory(order.statusHistory, targetStatus, userId, "ยืนยันนัดรับสำเร็จ"),
            "COMPLETED",
            "system",
            "ปล่อยเงินให้ผู้ขายแล้ว"
          ),
        },
      });
    }

    // COD + Meetup — just mark completed
    if (targetStatus === "MEETUP_CASH_COMPLETED") {
      await tx.escrowOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          codConfirmedAt: new Date(),
          statusHistory: pushHistory(
            pushHistory(order.statusHistory, targetStatus, userId, "ยืนยันนัดรับสำเร็จ"),
            "COMPLETED",
            "system",
            "ชำระเงินสดสำเร็จ"
          ),
        },
      });
    }
  });

  // Notify the other party
  const otherUserId = userId === order.buyerId ? order.sellerId : order.buyerId;
  await prisma.notification.create({
    data: {
      userId: otherUserId,
      type: "ORDER",
      message: `🤝 ยืนยันนัดรับเรียบร้อย — ธุรกรรมเสร็จสิ้น!`,
      link: "/dashboard/orders",
    },
  });

  revalidatePath("/dashboard/orders");
  return { success: true };
}

// ─── Confirm Meetup with Proof of Delivery (Seller only) ─────────────────────
//
// Called when the seller submits the Proof of Delivery modal.
// Stores the handover photo URL and buyer's signature, then transitions
// the order to MEETUP_COMPLETED / MEETUP_CASH_COMPLETED → COMPLETED.

export async function confirmMeetupWithProof(
  orderId: string,
  proof: {
    handoverPhotoUrl?:  string;
    handoverSignature?: string; // base64 PNG data URL
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "ไม่พบคำสั่งซื้อ" };
  if (order.sellerId !== userId) return { error: "เฉพาะผู้ขายเท่านั้นที่ยืนยันการส่งมอบได้" };

  let targetStatus: EscrowStatus;
  if (order.status === "MEETUP_SCHEDULED")   targetStatus = "MEETUP_COMPLETED";
  else if (order.status === "MEETUP_ARRANGED") targetStatus = "MEETUP_CASH_COMPLETED";
  else return { error: `ไม่สามารถยืนยันนัดรับในสถานะ ${order.status}` };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Save proof + advance to intermediate status
    await tx.escrowOrder.update({
      where: { id: orderId },
      data: {
        status:               targetStatus,
        deliveredAt:          now,
        handoverPhotoUrl:     proof.handoverPhotoUrl  ?? null,
        handoverSignature:    proof.handoverSignature ?? null,
        handoverConfirmedAt:  now,
        statusHistory: pushHistory(
          order.statusHistory,
          targetStatus,
          userId,
          "ผู้ขายยืนยันส่งมอบพร้อมหลักฐาน"
        ),
      },
    });

    // Escrow + Meetup → release funds → COMPLETED
    if (targetStatus === "MEETUP_COMPLETED") {
      const payout = order.sellerPayout ?? order.amount;

      await tx.user.update({
        where: { id: order.sellerId },
        data: {
          escrowBalance: { decrement: order.totalAmount ?? order.amount },
          walletBalance: { increment: payout },
        },
      });

      await tx.escrowOrder.update({
        where: { id: orderId },
        data: {
          status:      "COMPLETED",
          completedAt: now,
          statusHistory: pushHistory(
            pushHistory(order.statusHistory, targetStatus, userId, "ผู้ขายยืนยันส่งมอบพร้อมหลักฐาน"),
            "COMPLETED",
            "system",
            "ปล่อยเงินให้ผู้ขายแล้ว"
          ),
        },
      });
    }

    // COD + Meetup → mark completed
    if (targetStatus === "MEETUP_CASH_COMPLETED") {
      await tx.escrowOrder.update({
        where: { id: orderId },
        data: {
          status:         "COMPLETED",
          completedAt:    now,
          codConfirmedAt: now,
          statusHistory: pushHistory(
            pushHistory(order.statusHistory, targetStatus, userId, "ผู้ขายยืนยันส่งมอบพร้อมหลักฐาน"),
            "COMPLETED",
            "system",
            "ชำระเงินสดสำเร็จ"
          ),
        },
      });
    }
  });

  // Notify buyer
  await prisma.notification.create({
    data: {
      userId:  order.buyerId,
      type:    "ORDER",
      message: `🤝 ผู้ขายยืนยันส่งมอบสินค้าแล้ว — ธุรกรรมเสร็จสิ้น!`,
      link:    "/dashboard/orders",
    },
  });

  revalidatePath("/dashboard/orders");
  return { success: true };
}

// ─── Cancel Order (Buyer or Seller) ──────────────────────────────────────────

export async function cancelOrderNew(orderId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({
    where: { id: orderId },
    include: { item: { select: { title: true } } },
  });
  if (!order) return { error: "ไม่พบคำสั่งซื้อ" };

  const isParty = order.buyerId === userId || order.sellerId === userId;
  if (!isParty) return { error: "ไม่มีสิทธิ์" };

  if (!canTransition(order.status, "CANCELLED")) {
    return { error: "ไม่สามารถยกเลิกคำสั่งซื้อในสถานะนี้ได้" };
  }

  await prisma.$transaction(async (tx) => {
    // Refund if Escrow payment was held
    if (order.paymentMethod === "ESCROW" || order.paymentMethod === null) {
      const refundAmount = order.totalAmount ?? order.amount;

      await tx.user.update({
        where: { id: order.buyerId },
        data: { walletBalance: { increment: refundAmount } },
      });

      await tx.user.update({
        where: { id: order.sellerId },
        data: { escrowBalance: { decrement: refundAmount } },
      });
    }

    // Update order
    await tx.escrowOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason || "ผู้ใช้ยกเลิก",
        cancelledBy: userId,
        cancelledAt: new Date(),
        statusHistory: pushHistory(order.statusHistory, "CANCELLED", userId, reason || "ผู้ใช้ยกเลิก"),
      },
    });

    // Restore item status
    await tx.item.update({
      where: { id: order.itemId },
      data: { status: "APPROVED" },
    });
  });

  // Notify the other party
  const otherUserId = userId === order.buyerId ? order.sellerId : order.buyerId;
  const role = userId === order.buyerId ? "ผู้ซื้อ" : "ผู้ขาย";
  await prisma.notification.create({
    data: {
      userId: otherUserId,
      type: "ORDER",
      message: `❌ ${role}ยกเลิกคำสั่งซื้อ "${order.item.title}"${order.paymentMethod === "ESCROW" || !order.paymentMethod ? " — เงินคืนแล้ว" : ""}`,
      link: "/dashboard/orders",
    },
  });

  revalidatePath("/dashboard/orders");
  return { success: true };
}

// ─── Get Order Details ───────────────────────────────────────────────────────

export async function getOrderDetails(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  const order = await prisma.escrowOrder.findUnique({
    where: { id: orderId },
    include: {
      item: {
        select: {
          id: true, title: true, price: true, emoji: true, color: true,
          images: { select: { url: true, isMain: true }, orderBy: { order: "asc" } },
        },
      },
      buyer: { select: { id: true, name: true, email: true, image: true } },
      seller: { select: { id: true, name: true, email: true, image: true } },
      review: true,
    },
  });

  if (!order) return { error: "ไม่พบคำสั่งซื้อ" };

  const isParty = order.buyerId === userId || order.sellerId === userId;
  const isAdmin = (session.user as any).role === "ADMIN";
  if (!isParty && !isAdmin) return { error: "ไม่มีสิทธิ์เข้าถึง" };

  return {
    order: {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      shippedAt: order.shippedAt?.toISOString() ?? null,
      meetupDateTime: order.meetupDateTime?.toISOString() ?? null,
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      codConfirmedAt: order.codConfirmedAt?.toISOString() ?? null,
      expiresAt: order.expiresAt?.toISOString() ?? null,
    },
    currentUserId: userId,
  };
}
