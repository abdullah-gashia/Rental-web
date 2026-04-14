"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRUST_FLOOR   = 0;
const TRUST_CEILING = 200;

/** Rating → seller score delta */
const sellerDelta = (rating: number) =>
  rating >= 4 ? +5 : rating <= 2 ? -5 : 0;

/** Buyer always earns this for completing a transaction */
const BUYER_PARTICIPATION_REWARD = 2;

/** Points deducted from the party who cancels a transaction */
const CANCELLATION_PENALTY = 3;

function clamp(n: number): number {
  return Math.max(TRUST_FLOOR, Math.min(TRUST_CEILING, n));
}

// ─── Create Transaction ───────────────────────────────────────────────────────
//
// Called by the buyer when they decide to proceed with a purchase.
// Prevents self-purchase and duplicate pending transactions on the same item.

export async function createTransaction(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { sellerId: true, status: true },
  });

  if (!item)                          return { error: "Item not found" };
  if (item.status !== "APPROVED")     return { error: "Item is not available" };
  if (item.sellerId === session.user.id) return { error: "You cannot buy your own item" };

  // Return existing PENDING transaction if one already exists (idempotent)
  const existing = await prisma.transaction.findFirst({
    where: { itemId, buyerId: session.user.id, status: "PENDING" },
  });
  if (existing) return { transaction: existing };

  const transaction = await prisma.transaction.create({
    data: {
      itemId,
      buyerId:  session.user.id,
      sellerId: item.sellerId,
    },
  });

  // Notify the seller
  await prisma.notification.create({
    data: {
      userId:  item.sellerId,
      type:    "ORDER",
      message: "🛒 มีผู้ซื้อเริ่มต้นธุรกรรมกับสินค้าของคุณ",
      link:    `/dashboard/my-items`,
    },
  });

  return { transaction };
}

// ─── Complete Transaction + Leave Review ──────────────────────────────────────
//
// Called by the buyer after they have received the item.
// Atomically marks the transaction COMPLETED, creates the review, and
// adjusts both parties' trust scores — all inside one interactive transaction
// so a partial failure cannot leave scores in an inconsistent state.

export async function completeTransaction(
  transactionId: string,
  rating: number,
  comment?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be an integer between 1 and 5" };
  }

  const transaction = await prisma.transaction.findUnique({
    where:   { id: transactionId },
    include: { review: true },
  });

  if (!transaction)                               return { error: "Transaction not found" };
  if (transaction.buyerId !== session.user.id)    return { error: "Only the buyer can complete this transaction" };
  if (transaction.status !== "PENDING")           return { error: "Transaction is not pending" };
  if (transaction.review)                         return { error: "This transaction has already been reviewed" };

  const buyerId = session.user.id; // captured before async callbacks
  const delta   = sellerDelta(rating);

  // Interactive transaction: read current scores → compute clamped values → write
  await prisma.$transaction(async (tx) => {
    const [seller, buyer] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: transaction.sellerId }, select: { trustScore: true } }),
      tx.user.findUniqueOrThrow({ where: { id: buyerId },              select: { trustScore: true } }),
    ]);

    await Promise.all([
      // Mark transaction COMPLETED
      tx.transaction.update({
        where: { id: transactionId },
        data:  { status: "COMPLETED" },
      }),
      // Persist the review
      tx.review.create({
        data: {
          transactionId,
          rating,
          comment:    comment?.trim() || null,
          reviewerId: buyerId,
          revieweeId: transaction.sellerId,
        },
      }),
      // Update seller score (clamped)
      tx.user.update({
        where: { id: transaction.sellerId },
        data:  { trustScore: clamp(seller.trustScore + delta) },
      }),
      // Reward buyer for completing (clamped)
      tx.user.update({
        where: { id: buyerId },
        data:  { trustScore: clamp(buyer.trustScore + BUYER_PARTICIPATION_REWARD) },
      }),
    ]);

    // Notify seller of the review
    const stars = "⭐".repeat(rating);
    await tx.notification.create({
      data: {
        userId:  transaction.sellerId,
        type:    "ORDER",
        message: `${stars} ผู้ซื้อให้รีวิว ${rating}/5 — "${comment?.trim() || "ไม่มีความคิดเห็น"}"`,
        link:    `/user/${transaction.sellerId}`,
      },
    });
  });

  revalidatePath(`/user/${transaction.sellerId}`);
  revalidatePath("/dashboard/my-items");
  return { success: true };
}

// ─── Cancel Transaction ───────────────────────────────────────────────────────
//
// Either the buyer OR the seller may cancel a PENDING transaction.
// The party who cancels receives a -3 trust score penalty to discourage flaking.

export async function cancelTransaction(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction)                    return { error: "Transaction not found" };
  if (transaction.status !== "PENDING") return { error: "Transaction is not pending" };

  const callerId = session.user.id; // captured before async callbacks
  const isBuyer  = transaction.buyerId  === callerId;
  const isSeller = transaction.sellerId === callerId;
  if (!isBuyer && !isSeller)           return { error: "Not authorized" };

  await prisma.$transaction(async (tx) => {
    const caller = await tx.user.findUniqueOrThrow({
      where:  { id: callerId },
      select: { trustScore: true },
    });

    await Promise.all([
      tx.transaction.update({
        where: { id: transactionId },
        data:  { status: "CANCELLED" },
      }),
      tx.user.update({
        where: { id: callerId },
        data:  { trustScore: clamp(caller.trustScore - CANCELLATION_PENALTY) },
      }),
    ]);

    // Notify the other party
    const otherId = isBuyer ? transaction.sellerId : transaction.buyerId;
    const role    = isBuyer ? "ผู้ซื้อ" : "ผู้ขาย";
    await tx.notification.create({
      data: {
        userId:  otherId,
        type:    "ORDER",
        message: `❌ ${role}ได้ยกเลิกธุรกรรม`,
        link:    "/dashboard/my-items",
      },
    });
  });

  revalidatePath("/dashboard/my-items");
  return { success: true };
}

// ─── Penalize User (Admin only) ───────────────────────────────────────────────
//
// Used by admins or automated system triggers (e.g., listing fraud, no-show).
// Records a notification so the penalised user knows why their score changed.

export async function penalizeUser(
  userId: string,
  points: number,
  reason: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const caller = session.user as { role?: string };
  if (caller.role !== "ADMIN") return { error: "Forbidden" };
  if (!Number.isInteger(points) || points <= 0) return { error: "Points must be a positive integer" };
  if (!reason.trim()) return { error: "A reason is required" };

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { trustScore: true },
    });

    await Promise.all([
      tx.user.update({
        where: { id: userId },
        data:  { trustScore: clamp(target.trustScore - points) },
      }),
      tx.notification.create({
        data: {
          userId,
          type:    "SYSTEM",
          message: `⚠️ คะแนนความน่าเชื่อถือของคุณถูกหัก ${points} คะแนน เหตุผล: ${reason.trim()}`,
        },
      }),
    ]);
  });

  return { success: true };
}

// ─── Get My Pending Transaction With a Seller ────────────────────────────────
//
// Used by the profile page to decide whether to show the review form.
// Returns the transaction ID if the current user (buyer) has a PENDING
// transaction with the given seller that has not yet been reviewed.

export async function getMyPendingTransaction(sellerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { transaction: null };

  const tx = await prisma.transaction.findFirst({
    where: {
      sellerId,
      buyerId: session.user.id,
      status:  "PENDING",
      review:  { is: null }, // Prisma syntax for "relation is absent"
    },
    select: { id: true },
  });

  return { transaction: tx ?? null };
}

// ─── Submit Direct Review (no transaction required) ──────────────────────────
//
// Allows any logged-in user to leave a review for a seller they haven't
// necessarily completed a formal transaction with. One review per reviewer
// per reviewee is enforced at the DB level via a unique index.

export async function submitDirectReview(
  revieweeId: string,
  rating: number,
  comment?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const reviewerId = session.user.id;
  if (reviewerId === revieweeId) return { error: "You cannot review yourself" };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  // Prevent duplicate direct reviews (one per reviewer per reviewee)
  const existing = await prisma.review.findFirst({
    where: { reviewerId, revieweeId, transactionId: null },
  });
  if (existing) return { error: "คุณได้รีวิวผู้ใช้นี้แล้ว" };

  const reviewee = await prisma.user.findUnique({
    where:  { id: revieweeId },
    select: { trustScore: true },
  });
  if (!reviewee) return { error: "User not found" };

  const delta = sellerDelta(rating);

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        rating,
        comment:    comment?.trim() || null,
        reviewerId,
        revieweeId,
        // transactionId intentionally omitted — direct review
      },
    });

    await tx.user.update({
      where: { id: revieweeId },
      data:  { trustScore: clamp(reviewee.trustScore + delta) },
    });

    const stars = "⭐".repeat(rating);
    await tx.notification.create({
      data: {
        userId:  revieweeId,
        type:    "SYSTEM",
        message: `${stars} คุณได้รับรีวิวใหม่ ${rating}/5 — "${comment?.trim() || "ไม่มีความคิดเห็น"}"`,
        link:    `/user/${revieweeId}`,
      },
    });
  });

  revalidatePath(`/user/${revieweeId}`);
  return { success: true };
}

// ─── Check if current user has already reviewed someone ──────────────────────

export async function hasReviewedUser(revieweeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { hasReviewed: false, currentUserId: null };

  const existing = await prisma.review.findFirst({
    where: { reviewerId: session.user.id, revieweeId },
    select: { id: true },
  });

  return { hasReviewed: !!existing, currentUserId: session.user.id };
}

// ─── Get User Public Profile Data ────────────────────────────────────────────
//
// Used by the /user/[id] public profile page.
// Returns trust score, aggregate stats, and the 10 most recent reviews.

export async function getUserProfile(userId: string) {
  if (!userId) throw new Error("userId is required to fetch profile");
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:         true,
      name:       true,
      image:      true,
      trustScore: true,
      createdAt:  true,
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take:    10,
        select: {
          id:        true,
          rating:    true,
          comment:   true,
          createdAt: true,
          reviewer: { select: { id: true, name: true, image: true } },
        },
      },
      sellerTransactions: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
  });

  if (!user) return { error: "User not found" };

  return {
    user: {
      ...user,
      createdAt:        user.createdAt.toISOString(),
      totalSold:        user.sellerTransactions.length,
      reviewsReceived:  user.reviewsReceived.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
}
