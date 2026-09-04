"use server";

import { z }      from "zod";
import { auth }   from "@/lib/auth";
import { prisma, prismaNoMail } from "@/lib/prisma";
import { sendAdminMessageEmail, isMailConfigured } from "@/lib/email";
import { AUDIENCE_LABEL, AUDIENCE_VALUES, type Audience } from "@/lib/broadcast-audiences";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; name?: string | null; email?: string | null };
}

// ─── Audiences ────────────────────────────────────────────────────────────────

/**
 * Who a broadcast goes to.
 *
 * Banned accounts are never included. Admins are excluded too — a site
 * announcement addressed to the person who wrote it is just noise. Every
 * account has an e-mail address (User.email is required and unique), so there
 * is nothing to filter for there.
 */
function audienceWhere(audience: Audience): Record<string, unknown> {
  const base: Record<string, unknown> = {
    isBanned: false,
    role:     "STUDENT",
  };

  switch (audience) {
    case "VERIFIED": return { ...base, verificationStatus: "APPROVED" };
    case "SELLERS":  return { ...base, items:              { some: {} } };
    case "BUYERS":   return { ...base, escrowOrdersBuying: { some: {} } };
    default:         return base;
  }
}

/**
 * People who switched e-mail off in their settings.
 *
 * An admin announcement is not a per-order notification, so this is offered as
 * a choice rather than enforced — but it defaults to respecting it, because
 * somebody who turned e-mail off did mean it.
 */
function optedOutFilter(respectPreference: boolean): Record<string, unknown> {
  if (!respectPreference) return {};
  return {
    OR: [
      { preferences: { is: null } },
      { preferences: { is: { emailNotifications: true } } },
    ],
  };
}

export interface AudienceCount {
  audience:  Audience;
  label:     string;
  total:     number;
  reachable: number;
}

/** Recipient counts for every audience, so the admin sees the blast radius first. */
export async function getAudienceCounts(): Promise<AudienceCount[]> {
  await requireAdmin();

  return Promise.all(
    AUDIENCE_VALUES.map(async (audience) => {
      const where = audienceWhere(audience);
      const [total, reachable] = await Promise.all([
        prisma.user.count({ where: where as never }),
        prisma.user.count({ where: { ...where, ...optedOutFilter(true) } as never }),
      ]);
      return { audience, label: AUDIENCE_LABEL[audience], total, reachable };
    }),
  );
}

// ─── Send ─────────────────────────────────────────────────────────────────────

const BroadcastSchema = z.object({
  audience:          z.enum(["ALL", "VERIFIED", "SELLERS", "BUYERS"]),
  subject:           z.string().trim().min(1, "กรุณาใส่หัวข้ออีเมล").max(150, "หัวข้อยาวเกินไป"),
  body:              z.string().trim().min(1, "กรุณาใส่เนื้อหาอีเมล").max(5000, "เนื้อหายาวเกินไป"),
  respectPreference: z.boolean(),
  alsoNotifyInApp:   z.boolean(),
  testOnly:          z.boolean(),
  // Where a test send goes. The admin account's own address is the default,
  // but seeded accounts often have an address that does not receive mail, so
  // the real destination has to be typeable.
  testEmail:         z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
});

export type BroadcastInput = z.infer<typeof BroadcastSchema>;

/**
 * A hard ceiling on one broadcast.
 *
 * Gmail's own limit for an app password is a few hundred messages a day; going
 * past it does not queue, it starts bouncing. Better to stop here and say so
 * than to half-send and leave nobody able to tell who got it.
 */
const MAX_RECIPIENTS = 200;

/** How many messages are in flight at once — Gmail throttles hard above this. */
const CONCURRENCY = 4;

export interface BroadcastResult {
  success:  boolean;
  error?:   string;
  sent?:    number;
  failed?:  number;
  message?: string;
}

export async function sendBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
  let parsed: BroadcastInput;
  let admin: { id: string; name?: string | null; email?: string | null };

  try {
    admin  = await requireAdmin();
    parsed = BroadcastSchema.parse(input);
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0].message };
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }

  if (!isMailConfigured) {
    return { success: false, error: "ยังไม่ได้ตั้งค่า GMAIL_USER / GMAIL_APP_PASSWORD" };
  }

  // ── Resolve recipients ────────────────────────────────────────────────────
  let recipients: { id: string; email: string; name: string | null }[];

  if (parsed.testOnly) {
    // One address only, so the real thing can be proof-read in an inbox before
    // it reaches anyone else.
    const to = parsed.testEmail?.trim() || admin.email;
    if (!to) {
      return { success: false, error: "กรุณาระบุอีเมลปลายทางสำหรับการทดสอบ" };
    }
    recipients = [{ id: admin.id, email: to, name: admin.name ?? null }];
  } else {
    recipients = await prisma.user.findMany({
      where: {
        ...audienceWhere(parsed.audience),
        ...optedOutFilter(parsed.respectPreference),
      } as never,
      select: { id: true, email: true, name: true },
      take: MAX_RECIPIENTS + 1,
    });

    if (recipients.length === 0) {
      return { success: false, error: "ไม่มีผู้รับที่ตรงกับกลุ่มเป้าหมายนี้" };
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return {
        success: false,
        error: `กลุ่มเป้าหมายเกิน ${MAX_RECIPIENTS} คน — กรุณาแบ่งส่งเป็นกลุ่มย่อย`,
      };
    }
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const adminName = admin.name ?? "ทีมงาน PSU Store";
  let sent = 0, failed = 0;

  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (r) => {
      // One message per person, never a shared To/CC line: a broadcast must not
      // hand every student a copy of everyone else's address.
      const res = await sendAdminMessageEmail({
        to:        r.email,
        subject:   parsed.subject,
        body:      parsed.body,
        adminName,
      });

      if (res.sent) sent++; else failed++;
    }));
  }

  // ── Mirror in-app ─────────────────────────────────────────────────────────
  // Written through prismaNoMail on purpose: the normal client turns every
  // notification into an e-mail, which would deliver the announcement twice.
  if (parsed.alsoNotifyInApp && !parsed.testOnly) {
    await prismaNoMail.notification.createMany({
      data: recipients.map((r) => ({
        userId:  r.id,
        type:    "SYSTEM" as const,
        message: `ประกาศจากทีมงาน: ${parsed.subject}`,
        link:    "/settings",
      })),
    }).catch((e: unknown) => {
      console.warn("[broadcast] in-app mirror failed:", e);
    });
  }

  const where = parsed.testOnly
    ? `ทดสอบ (${recipients[0].email})`
    : AUDIENCE_LABEL[parsed.audience];

  return {
    success: failed === 0,
    sent, failed,
    message: `ส่งถึง ${where} สำเร็จ ${sent} ฉบับ${failed ? ` · ล้มเหลว ${failed}` : ""}`,
    error:   failed > 0 ? `ส่งสำเร็จ ${sent} ฉบับ แต่ล้มเหลว ${failed} ฉบับ` : undefined,
  };
}
