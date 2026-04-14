"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Forbidden");
  return session.user.id;
}

// ─── List pending requests ────────────────────────────────────────────────────

export async function getVerificationRequests(filter: "PENDING" | "APPROVED" | "REJECTED" | "ALL" = "PENDING") {
  await requireAdmin();

  const where = filter === "ALL" ? {} : { status: filter as any };

  const requests = await prisma.verificationRequest.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, createdAt: true },
      },
    },
    take: 100,
  });

  return requests.map((r) => ({
    id: r.id,
    status: r.status,
    psuIdNumber: r.psuIdNumber,
    psuIdType: r.psuIdType,
    facultyOrDepartment: r.facultyOrDepartment,
    submittedAt: r.submittedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    rejectionReason: r.rejectionReason,
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      image: r.user.image,
      createdAt: r.user.createdAt.toISOString(),
    },
  }));
}

export type VerificationListItem = Awaited<ReturnType<typeof getVerificationRequests>>[number];

// ─── Get single request detail ────────────────────────────────────────────────

export async function getVerificationDetail(requestId: string) {
  await requireAdmin();

  const r = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, image: true,
          createdAt: true, verificationStatus: true,
          trustScore: true,
        },
      },
    },
  });

  if (!r) return null;

  return {
    id: r.id,
    status: r.status,
    psuIdNumber: r.psuIdNumber,
    psuIdType: r.psuIdType,
    facultyOrDepartment: r.facultyOrDepartment ?? null,
    idCardImageUrl: r.idCardImageUrl,
    idCardBackUrl: r.idCardBackUrl ?? null,
    selfieFrontUrl: r.selfieFrontUrl,
    selfieLeftUrl: r.selfieLeftUrl ?? null,
    selfieRightUrl: r.selfieRightUrl ?? null,
    selfieUpUrl: r.selfieUpUrl ?? null,
    rejectionReason: r.rejectionReason ?? null,
    adminNote: r.adminNote ?? null,
    submittedAt: r.submittedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    ipAddress: r.ipAddress ?? null,
    userAgent: r.userAgent ?? null,
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      image: r.user.image,
      createdAt: r.user.createdAt.toISOString(),
      verificationStatus: r.user.verificationStatus,
      trustScore: r.user.trustScore,
    },
  };
}

export type VerificationDetail = NonNullable<Awaited<ReturnType<typeof getVerificationDetail>>>;
