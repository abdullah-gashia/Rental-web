"use server";

import bcryptjs from "bcryptjs";
import { randomInt } from "crypto";
import { prismaNoMail as prisma } from "@/lib/prisma";
import { sendPasswordResetCodeEmail } from "@/lib/email";

/**
 * Forgotten-password reset by six-digit code.
 *
 * Three rules shape the whole of this file:
 *
 * It never says whether an address has an account. "If that address has an
 * account, the code is on its way" reads the same either way, so the form
 * cannot be used to find out who is registered here.
 *
 * The code is stored as a bcrypt hash and compared, never read back. Whoever
 * can read the table still cannot use what is in it.
 *
 * Guessing is capped. Six digits is a million possibilities, which a script
 * gets through quickly; five wrong tries burns the code and the person has to
 * ask for a new one.
 */

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 8;

/** Said to everyone, account or not. */
const NEUTRAL = "ถ้าอีเมลนี้มีบัญชีอยู่ ระบบได้ส่งรหัสยืนยันไปแล้ว กรุณาตรวจกล่องจดหมาย";

/**
 * A message plus the numbers that belong in it.
 *
 * The sentence is returned with {0} still in it rather than the number already
 * baked in, because the client translates it — and a sentence with a number
 * glued into the middle matches no dictionary entry.
 */
export type ResetResult =
  | { success: true;  message: string; params?: (string | number)[] }
  | { success: false; error:   string; params?: (string | number)[] };

function sixDigits(): string {
  // randomInt is drawn from the same source as key material, unlike Math.random.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/** Step one: ask for a code. */
export async function requestPasswordReset(rawEmail: string): Promise<ResetResult> {
  const email = normalise(rawEmail ?? "");
  if (!email || !email.includes("@")) {
    return { success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
  }

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, password: true, isBanned: true },
  });

  // Everything below is deliberately silent about what it found.
  const existing = await prisma.passwordResetCode.findUnique({
    where:  { email },
    select: { lastSentAt: true },
  });

  if (existing) {
    const since = (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (since < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - since);
      return { success: false, error: "กรุณารออีก {0} วินาทีก่อนขอรหัสใหม่", params: [wait] };
    }
  }

  // An account with no password signs in through Google; there is nothing to
  // reset, and a banned account should not be handed a way back in.
  const eligible = Boolean(user?.password) && !user?.isBanned;
  if (!eligible) return { success: true, message: NEUTRAL };

  const code = sixDigits();
  const codeHash = await bcryptjs.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await prisma.passwordResetCode.upsert({
    where:  { email },
    create: { email, codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
  });

  const res = await sendPasswordResetCodeEmail({
    to: email,
    code,
    minutesValid: CODE_TTL_MINUTES,
  });

  if (!res.sent) {
    // The code is useless if it never arrived, so do not leave it lying around.
    await prisma.passwordResetCode.delete({ where: { email } }).catch(() => {});
    console.warn("[reset] mail failed:", res.reason);
    return { success: false, error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  return { success: true, message: NEUTRAL };
}

/**
 * Checks a code without spending it.
 *
 * Only so the person can be told they mistyped before being asked to think up
 * a new password. resetPassword checks again, so nothing rests on this.
 */
export async function verifyResetCode(rawEmail: string, code: string): Promise<ResetResult> {
  const check = await consumeCheck(normalise(rawEmail ?? ""), code ?? "", false);
  return check.ok
    ? { success: true, message: "รหัสถูกต้อง" }
    : { success: false, error: check.error, params: check.params };
}

/** Step three: set the new password, and burn the code. */
export async function resetPassword(
  rawEmail: string,
  code: string,
  newPassword: string,
): Promise<ResetResult> {
  const email = normalise(rawEmail ?? "");

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: "รหัสผ่านต้องมีอย่างน้อย {0} ตัวอักษร", params: [MIN_PASSWORD_LENGTH] };
  }

  const check = await consumeCheck(email, code ?? "", true);
  if (!check.ok) return { success: false, error: check.error, params: check.params };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { success: false, error: "ไม่พบบัญชีผู้ใช้" };

  await prisma.user.update({
    where: { id: user.id },
    data:  { password: await bcryptjs.hash(newPassword, 10) },
  });

  await prisma.passwordResetCode.delete({ where: { email } }).catch(() => {});

  return { success: true, message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบด้วยรหัสใหม่ได้เลย" };
}

/**
 * The one place a code is judged.
 *
 * A wrong guess counts against the code whether it came from the verify step
 * or the reset step, so the cap cannot be walked around by using one and not
 * the other.
 */
async function consumeCheck(
  email: string,
  code: string,
  final: boolean,
): Promise<{ ok: true } | { ok: false; error: string; params?: (string | number)[] }> {
  const row = await prisma.passwordResetCode.findUnique({ where: { email } });

  if (!row) return { ok: false, error: "รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่" };

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetCode.delete({ where: { email } }).catch(() => {});
    return { ok: false, error: "รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่" };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.passwordResetCode.delete({ where: { email } }).catch(() => {});
    return { ok: false, error: "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่" };
  }

  const match = await bcryptjs.compare(code.trim(), row.codeHash);
  if (!match) {
    const attempts = row.attempts + 1;
    await prisma.passwordResetCode.update({ where: { email }, data: { attempts } });
    const left = MAX_ATTEMPTS - attempts;
    return left > 0
      ? { ok: false, error: "รหัสไม่ถูกต้อง เหลืออีก {0} ครั้ง", params: [left] }
      : { ok: false, error: "กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่" };
  }

  void final;   // the caller deletes the row once the password is actually set
  return { ok: true };
}
