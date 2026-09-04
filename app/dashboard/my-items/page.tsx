import { getMyItems } from "@/lib/actions/moderation-actions";
import { getMyReputation } from "@/lib/actions/trust-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyItemsClient from "./MyItemsClient";

export default async function MyItemsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [result, reputationResult] = await Promise.all([
    getMyItems(),
    getMyReputation(),
  ]);
  const items = result.items ?? [];

  return (
    <MyItemsClient
      items={items as any}
      userName={session.user.name ?? "ผู้ใช้"}
      reputation={"profile" in reputationResult ? (reputationResult.profile ?? null) : null}
    />
  );
}
