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
