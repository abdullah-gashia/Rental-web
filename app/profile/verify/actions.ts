"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { KycSubmissionSchema, ReviewVerificationSchema } from "@/lib/validations/kyc";
import type { KycSubmissionInput, ReviewVerificationInput } from "@/lib/validations/kyc";

// ─── Submit Verification Request ─────────────────────────────────────────────

export async function submitVerification(input: KycSubmissionInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };
  const userId = session.user.id;

  // Check current status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true },
  });

  if (user?.verificationStatus === "APPROVED") {
    return { success: false, error: "บัญชีของคุณผ่านการยืนยันแล้ว" };
  }
  if (user?.verificationStatus === "PENDING") {
    return { success: false, error: "คุณมีคำขอรอตรวจสอบอยู่แล้ว กรุณารอผลการตรวจสอบ" };
  }

  // Validate input
  const parsed = KycSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const data = parsed.data;

  // Check for duplicate PSU ID already verified by another account
  const duplicate = await prisma.user.findFirst({
    where: {
      psuIdNumber:        data.psuIdNumber,
      verificationStatus: "APPROVED",
      id:                 { not: userId },
    },
  });
  if (duplicate) {
    return { success: false, error: "รหัสประจำตัวนี้ถูกยืนยันโดยบัญชีอื่นแล้ว" };
  }

  // Create request + update user status atomically
  await prisma.$transaction([
    prisma.verificationRequest.create({
      data: {
        userId,
        psuIdNumber:         data.psuIdNumber,
        psuIdType:           data.psuIdType,
        facultyOrDepartment: data.facultyOrDepartment,
        idCardImageUrl:      data.idCardImageUrl,
        idCardBackUrl:       data.idCardBackUrl,
        selfieFrontUrl:      data.selfieFrontUrl,
        selfieLeftUrl:       data.selfieLeftUrl,
        selfieRightUrl:      data.selfieRightUrl,
        selfieUpUrl:         data.selfieUpUrl,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { verificationStatus: "PENDING" },
    }),
  ]);

  // Notify admins
  const admins = await prisma.user.findMany({
    where:  { role: "ADMIN" },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId:  a.id,
      type:    "MODERATION" as const,
      message: "🔍 มีคำขอยืนยันตัวตนใหม่รอตรวจสอบ",
      link:    "/admin/verifications",
    })),
  }).catch(console.error);

  revalidatePath("/profile/verify");
  revalidatePath("/admin/verifications");

  return {
    success: true,
    message: "ส่งคำขอยืนยันตัวตนเรียบร้อยแล้ว กรุณารอการตรวจสอบภายใน 24 ชม.",
  };
}

// ─── Get current user's verification status ───────────────────────────────────

export async function getMyVerificationStatus() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { verificationStatus: true, psuIdNumber: true, psuIdType: true, verifiedAt: true },
  });

  const latestRequest = await prisma.verificationRequest.findFirst({
    where:   { userId: session.user.id },
    orderBy: { submittedAt: "desc" },
    select:  { submittedAt: true, rejectionReason: true, status: true },
  });

  return { user, latestRequest };
}

// ─── Admin: review a verification request ────────────────────────────────────

export async function reviewVerification(input: ReviewVerificationInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { role: true },
  });
  if (admin?.role !== "ADMIN") return { success: false, error: "ไม่มีสิทธิ์" };

  const parsed = ReviewVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const { requestId, decision, rejectionReason, adminNote } = parsed.data;

  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, psuIdNumber: true, psuIdType: true, status: true },
  });
  if (!request) return { success: false, error: "ไม่พบคำขอ" };
  if (request.status !== "PENDING") {
    return { success: false, error: "คำขอนี้ถูกตรวจสอบแล้ว" };
  }

  await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status:          decision,
        reviewedBy:      session.user.id,
        reviewedAt:      new Date(),
        rejectionReason: rejectionReason ?? null,
        adminNote:       adminNote ?? null,
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data:
        decision === "APPROVED"
          ? {
              verificationStatus: "APPROVED",
              psuIdNumber:        request.psuIdNumber,
              psuIdType:          request.psuIdType,
              verifiedAt:         new Date(),
            }
          : { verificationStatus: "REJECTED" },
    }),
  ]);

  // Notify the applicant
  const msg =
    decision === "APPROVED"
      ? "🎉 การยืนยันตัวตนของคุณผ่านการอนุมัติแล้ว! คุณสามารถลงขายสินค้าได้เลย"
      : `❌ การยืนยันตัวตนถูกปฏิเสธ: ${rejectionReason}. คุณสามารถส่งคำขอใหม่ได้`;

  await prisma.notification.create({
    data: {
      userId:  request.userId,
      type:    "MODERATION",
      message: msg,
      link:    "/profile/verify",
    },
  }).catch(console.error);

  revalidatePath("/admin/verifications");
  revalidatePath("/profile/verify");

  return { success: true };
}
