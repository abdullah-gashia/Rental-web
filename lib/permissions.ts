import "server-only";
import { auth } from "@/lib/auth";

/**
 * Who is allowed to do what.
 *
 * The middleware keeps people off pages; this keeps them out of the actions
 * behind those pages. Both layers exist on purpose — a mistake in the route
 * matcher should not turn into an open endpoint, and a server action that only
 * trusts the middleware is a server action with no guard at all.
 */

export type AppRole = "ADMIN" | "STUDENT" | "PATTARA";

export interface SessionUser {
  id:    string;
  role:  AppRole;
  name?: string | null;
  email?: string | null;
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as (SessionUser & { id?: string }) | undefined;
  if (!u?.id) return null;
  return { id: u.id, role: (u.role ?? "STUDENT") as AppRole, name: u.name, email: u.email };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new Error("กรุณาเข้าสู่ระบบ");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new Error("Unauthorized");
  return u;
}

/** The office, or an admin standing in for it. */
export async function requireOffice(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "PATTARA" && u.role !== "ADMIN") throw new Error("Unauthorized");
  return u;
}

/**
 * Blocks trading for accounts that exist to run the site rather than shop on it.
 *
 * งานภัทร is an institution: it lends equipment and does not buy, sell or rent.
 * Admins are blocked too — someone who approves listings should not also be
 * selling on the same marketplace.
 *
 * Returns an error string to hand straight back to the caller, or null when the
 * account may trade.
 */
export function tradingBlockReason(role: AppRole): string | null {
  if (role === "PATTARA") {
    return "บัญชีงานภัทรเป็นบัญชีหน่วยงาน ไม่สามารถซื้อ ขาย หรือเช่าสินค้าได้";
  }
  if (role === "ADMIN") {
    return "บัญชีผู้ดูแลระบบไม่สามารถซื้อ ขาย หรือเช่าสินค้าได้";
  }
  return null;
}

/** Only students borrow — the office lends, and admins oversee. */
export function borrowBlockReason(role: AppRole): string | null {
  if (role === "PATTARA") return "บัญชีงานภัทรเป็นผู้ให้ยืม ไม่สามารถยืมของตัวเองได้";
  if (role === "ADMIN")   return "บัญชีผู้ดูแลระบบไม่สามารถยืมอุปกรณ์ได้";
  return null;
}
