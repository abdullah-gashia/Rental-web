import { getTr } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyBorrows } from "@/lib/actions/borrow-orders";
import MyBorrowsClient from "./MyBorrowsClient";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("ของที่ยืม | PSU Store"),};
}

export default async function MyBorrowsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?login=1");

  const [orders, me] = await Promise.all([
    getMyBorrows(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { borrowSuspendedUntil: true, lendingTier: true },
    }),
  ]);

  return (
    <MyBorrowsClient
      orders={orders}
      suspendedUntil={me?.borrowSuspendedUntil?.toISOString() ?? null}
      tier={me?.lendingTier ?? "NEW_USER"}
    />
  );
}
