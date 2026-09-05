import { getTr } from "@/lib/i18n/server";
import { getMyItems } from "@/lib/actions/moderation-actions";
import { getMyReputation } from "@/lib/actions/trust-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyItemsClient from "./MyItemsClient";

export default async function MyItemsPage() {
  const tr = await getTr();
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
      userName={session.user.name ?? tr("ผู้ใช้")}
      reputation={"profile" in reputationResult ? (reputationResult.profile ?? null) : null}
    />
  );
}
