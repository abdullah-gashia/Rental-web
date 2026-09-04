"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { REPORT_CATEGORY_VALUES } from "@/lib/report-categories";

/**
 * Abuse reports filed from a public profile.
 *
 * Reports are for admins only. Nothing here ever returns a report to the
 * person being reported, and no notification is sent to them — a seller who
 * could see who flagged them could retaliate.
 */

type ActionResult =
  | { success: true;  message: string }
  | { success: false; error: string   };

export async function submitReport(input: {
  reportedId: string;
  category: string;
  reason: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนรายงาน" };
  }

  const reporterId = session.user.id;
  const reason = input.reason.trim();

  if (reporterId === input.reportedId) {
    return { success: false, error: "ไม่สามารถรายงานตัวเองได้" };
  }
  if (!REPORT_CATEGORY_VALUES.has(input.category as never)) {
    return { success: false, error: "กรุณาเลือกหัวข้อการรายงาน" };
  }
  if (reason.length < 10) {
    return { success: false, error: "กรุณาอธิบายเหตุผลอย่างน้อย 10 ตัวอักษร" };
  }
  if (reason.length > 2000) {
    return { success: false, error: "เหตุผลยาวเกินไป (สูงสุด 2000 ตัวอักษร)" };
  }

  const reported = await prisma.user.findUnique({
    where: { id: input.reportedId }, select: { id: true, role: true },
  });
  if (!reported) return { success: false, error: "ไม่พบผู้ใช้ที่ต้องการรายงาน" };

  // Reports are a tool for flagging bad trading behaviour between students.
  // An office or an administrator is not a trader, and routing complaints
  // about a service through the abuse queue only buries real reports.
  if (reported.role !== "STUDENT") {
    return {
      success: false,
      error: "บัญชีหน่วยงานและผู้ดูแลระบบรายงานผ่านช่องทางนี้ไม่ได้ — กรุณาติดต่อผู้ดูแลระบบโดยตรง",
    };
  }

  // One open report per reporter per user: repeat submissions would just bury
  // the queue without telling an admin anything new.
  const existing = await prisma.report.findFirst({
    where: { reporterId, reportedId: input.reportedId, status: "OPEN" },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "คุณรายงานผู้ใช้รายนี้ไปแล้ว ทีมงานกำลังตรวจสอบอยู่" };
  }

  await prisma.report.create({
    data: { reporterId, reportedId: input.reportedId, category: input.category, reason },
  });

  // Deliberately no notification to the reported user.
  revalidatePath("/admin/users");
  return { success: true, message: "ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบให้เร็วที่สุด" };
}

/** Whether the signed-in user already has an open report against someone. */
export async function hasOpenReport(reportedId: string) {
  const session = await auth();
  if (!session?.user?.id) return { reported: false, signedIn: false };

  const existing = await prisma.report.findFirst({
    where: { reporterId: session.user.id, reportedId, status: "OPEN" },
    select: { id: true },
  });
  return { reported: !!existing, signedIn: true, isSelf: session.user.id === reportedId };
}
