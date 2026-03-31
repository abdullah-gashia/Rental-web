import { getMyItems } from "@/lib/actions/moderation-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyItemsClient from "./MyItemsClient";

export default async function MyItemsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const result = await getMyItems();
  const items = result.items ?? [];

  return (
    <MyItemsClient
      items={items as any}
      userName={session.user.name ?? "ผู้ใช้"}
    />
  );
}
