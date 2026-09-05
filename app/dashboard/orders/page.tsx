import { getMyOrders } from "@/lib/actions/escrow-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [result, { tab }] = await Promise.all([getMyOrders(), searchParams]);

  if ("error" in result) redirect("/");

  return (
    <OrdersClient
      buying={result.buying as any}
      selling={result.selling as any}
      walletBalance={result.walletBalance}
      escrowBalance={result.escrowBalance}
      currentUserId={session.user.id}
      initialTab={tab === "selling" ? "selling" : "buying"}
    />
  );
}
