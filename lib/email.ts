import "server-only";
import nodemailer from "nodemailer";

/**
 * Outgoing mail over Gmail SMTP.
 *
 * Needs a Google App Password (not the account password) — Google rejects
 * plain account passwords for SMTP. Generate one at
 * https://myaccount.google.com/apppasswords (requires 2-Step Verification).
 */
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

export const isMailConfigured = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!isMailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

/**
 * Public base URL for links inside e-mails.
 *
 * NEXTAUTH_URL must not be set on Vercel (it would break the OAuth callback),
 * so fall back to the stable production domain Vercel injects. Without this the
 * "change password" button in a production e-mail points at localhost.
 */
function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

type SendResult =
  | { sent: true }
  | { sent: false; reason: string };

/**
 * Sends the credentials generated for a brand new Google sign-up.
 *
 * Never throws: a mail outage must not take the sign-up down with it. The same
 * details are also delivered through the in-app notification bell, so a failed
 * send is a degraded experience rather than a lost account.
 */
export async function sendGeneratedPasswordEmail(
  to: string,
  password: string,
): Promise<SendResult> {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, reason: "GMAIL_USER / GMAIL_APP_PASSWORD not configured" };
  }

  const settingsUrl = `${appUrl()}/settings?tab=profile`;

  const text = [
    "ยินดีต้อนรับสู่ PSU Store",
    "",
    "บัญชีของคุณถูกสร้างเรียบร้อยแล้ว นอกจากปุ่ม “เข้าสู่ระบบด้วย Google”",
    "คุณยังเข้าสู่ระบบด้วยอีเมลและรหัสผ่านด้านล่างนี้ได้เช่นกัน",
    "",
    `ชื่อผู้ใช้ : ${to}`,
    `รหัสผ่าน  : ${password}`,
    "",
    "รหัสผ่านนี้ระบบสุ่มสร้างให้ กรุณาเปลี่ยนเป็นรหัสผ่านของคุณเองที่หน้าการตั้งค่า:",
    settingsUrl,
    "",
    "หากไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยต่ออีเมลฉบับนี้",
    "— PSU Store",
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#0f1e35">
  <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;color:#0a2b5e">ยินดีต้อนรับสู่ PSU Store</h1>
  <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#64748b">
    บัญชีของคุณถูกสร้างเรียบร้อยแล้ว นอกจากปุ่ม &ldquo;เข้าสู่ระบบด้วย Google&rdquo;
    คุณยังเข้าสู่ระบบด้วยอีเมลและรหัสผ่านด้านล่างนี้ได้เช่นกัน
  </p>

  <table style="width:100%;border-collapse:collapse;border:1px solid #e3e8f0;border-radius:10px;overflow:hidden;font-size:14px">
    <tr>
      <td style="padding:12px 14px;background:#f7f9fc;color:#64748b;width:110px">ชื่อผู้ใช้</td>
      <td style="padding:12px 14px;font-family:ui-monospace,monospace">${to}</td>
    </tr>
    <tr>
      <td style="padding:12px 14px;background:#f7f9fc;color:#64748b;border-top:1px solid #e3e8f0">รหัสผ่าน</td>
      <td style="padding:12px 14px;border-top:1px solid #e3e8f0;font-family:ui-monospace,monospace;font-size:16px;letter-spacing:1px;color:#0a2b5e">${password}</td>
    </tr>
  </table>

  <p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#64748b">
    รหัสผ่านนี้ระบบสุ่มสร้างให้ เพื่อความปลอดภัยกรุณาเปลี่ยนเป็นรหัสผ่านของคุณเอง
  </p>
  <p style="margin:16px 0 0">
    <a href="${settingsUrl}" style="display:inline-block;background:#0a2b5e;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:7px">
      เปลี่ยนรหัสผ่าน
    </a>
  </p>

  <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #e3e8f0;font-size:12px;color:#94a3b8">
    หากไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยต่ออีเมลฉบับนี้ &middot; PSU Store
  </p>
</div>`.trim();

  try {
    await mailer.sendMail({
      from: `"PSU Store" <${GMAIL_USER}>`,
      to,
      subject: "บัญชี PSU Store ของคุณ — ชื่อผู้ใช้และรหัสผ่าน",
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "unknown error" };
  }
}

// ─── Notification mirror ──────────────────────────────────────────────────────

/** Heading shown above each notification type in the e-mail. */
const TYPE_HEADING: Record<string, string> = {
  ORDER:      "อัปเดตคำสั่งซื้อ",
  MESSAGE:    "ข้อความใหม่",
  MODERATION: "อัปเดตประกาศของคุณ",
  SYSTEM:     "แจ้งเตือนจากระบบ",
};

/**
 * Mirrors one in-app notification to e-mail.
 *
 * Same contract as the welcome mail: never throws, so a mail outage can't take
 * down the action that produced the notification.
 */
export async function sendNotificationEmail(input: {
  to: string;
  type: string;
  message: string;
  link?: string | null;
}): Promise<SendResult> {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, reason: "GMAIL_USER / GMAIL_APP_PASSWORD not configured" };
  }

  const heading  = TYPE_HEADING[input.type] ?? "แจ้งเตือนจากระบบ";
  const base     = appUrl();
  const linkUrl  = input.link ? `${base}${input.link.startsWith("/") ? "" : "/"}${input.link}` : base;
  const prefsUrl = `${base}/settings?tab=notifications`;

  const text = [
    `PSU Store — ${heading}`,
    "",
    input.message,
    "",
    `เปิดดูในเว็บไซต์: ${linkUrl}`,
    "",
    `ปิดการแจ้งเตือนทางอีเมลได้ที่: ${prefsUrl}`,
    "— PSU Store",
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#0f1e35">
  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#64748b">PSU Store</p>
  <h1 style="margin:0 0 18px;font-size:19px;font-weight:600;color:#0a2b5e">${heading}</h1>

  <div style="border:1px solid #e3e8f0;border-left:3px solid #0a2b5e;border-radius:8px;padding:16px 18px;font-size:14px;line-height:1.75;background:#f7f9fc">
    ${escapeHtml(input.message)}
  </div>

  <p style="margin:20px 0 0">
    <a href="${linkUrl}" style="display:inline-block;background:#0a2b5e;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:7px">
      เปิดดูในเว็บไซต์
    </a>
  </p>

  <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #e3e8f0;font-size:12px;color:#94a3b8">
    ไม่ต้องการอีเมลแบบนี้? <a href="${prefsUrl}" style="color:#64748b">ปิดการแจ้งเตือนทางอีเมล</a>
  </p>
</div>`.trim();

  try {
    await mailer.sendMail({
      from: `"PSU Store" <${GMAIL_USER}>`,
      to: input.to,
      subject: `[PSU Store] ${heading}`,
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "unknown error" };
  }
}

/** Notification text is user-supplied in places (chat, disputes) — escape it. */
function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Admin → user message ─────────────────────────────────────────────────────

/**
 * A message an admin composes by hand and sends to one user.
 *
 * Kept plain on purpose: the admin's words are shown as written, with only the
 * site's own framing around them. Same never-throws contract as the rest.
 */
export async function sendAdminMessageEmail(input: {
  to: string;
  subject: string;
  body: string;
  adminName?: string | null;
}): Promise<SendResult> {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, reason: "GMAIL_USER / GMAIL_APP_PASSWORD not configured" };
  }

  const from = input.adminName?.trim() || "ทีมงาน PSU Store";

  const text = [
    input.body,
    "",
    "—",
    `ส่งจาก ${from} · PSU Store`,
    appUrl(),
  ].join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#0f1e35">
  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#64748b">PSU Store</p>
  <h1 style="margin:0 0 18px;font-size:19px;font-weight:600;color:#0a2b5e">${escapeHtml(input.subject)}</h1>

  <div style="border:1px solid #e3e8f0;border-left:3px solid #0a2b5e;border-radius:8px;padding:16px 18px;font-size:14px;line-height:1.8;background:#f7f9fc;white-space:pre-wrap">${escapeHtml(input.body)}</div>

  <p style="margin:22px 0 0;font-size:12px;color:#94a3b8">
    ส่งจาก ${escapeHtml(from)} · <a href="${appUrl()}" style="color:#64748b">PSU Store</a>
  </p>
</div>`.trim();

  try {
    await mailer.sendMail({
      from: `"PSU Store" <${GMAIL_USER}>`,
      to: input.to,
      subject: input.subject,
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "unknown error" };
  }
}
