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

  const settingsUrl =
    (process.env.NEXTAUTH_URL ?? "http://localhost:3000") + "/settings?tab=profile";

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
