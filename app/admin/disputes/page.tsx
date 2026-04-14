import { getDisputedOrders } from "@/lib/actions/escrow-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DisputesClient from "./DisputesClient";

export default async function DisputesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if ((session.user as any).role !== "ADMIN") redirect("/");

  const result = await getDisputedOrders();
  if ("error" in result) redirect("/admin/approvals");

  return <DisputesClient orders={result.orders as any} />;
}
