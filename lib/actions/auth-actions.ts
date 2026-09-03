"use server";

import { signIn, signOut } from "@/lib/auth";

export async function loginWithCredentials(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (err: any) {
    // NextAuth wraps authorize() errors — extract the original message
    const msg: string = err?.message ?? err?.cause?.err?.message ?? "";
    if (msg.includes("ACCOUNT_BANNED")) {
      return { error: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
    }
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }
}

export async function logout() {
  await signOut({ redirect: false });
  return { success: true };
}

/**
 * Google sign-in. Lands on the marketplace — a new account can browse and buy
 * right away. Identity verification is only for sellers, and PostAdModal sends
 * them to /profile/verify when they try to list something.
 *
 * Returns an error instead of redirecting when the provider is not configured —
 * otherwise Auth.js sends the user to Google with client_id=undefined and they
 * land on Google's own "OAuth client was not found" page.
 */
export async function loginWithGoogle(): Promise<{ error: string } | void> {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    return { error: "ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google กรุณาติดต่อผู้ดูแลระบบ" };
  }

  await signIn("google", { redirectTo: "/" });
}
