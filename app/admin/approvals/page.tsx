import { getPendingItems } from "@/lib/actions/moderation-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ApprovalsClient from "./ApprovalsClient";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if ((session.user as any).role !== "ADMIN") redirect("/");

  const result = await getPendingItems();
  const items = result.items ?? [];

  return <ApprovalsClient items={items as any} />;
}
