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
  } catch {
    return { error: "Invalid email or password" };
  }
}

export async function logout() {
  await signOut({ redirect: false });
  return { success: true };
}
