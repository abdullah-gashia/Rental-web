import { getItemForEdit } from "@/lib/actions/moderation-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EditItemClient from "./EditItemClient";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;
  const result = await getItemForEdit(id);

  if (result.error || !result.item) redirect("/dashboard/my-items");

  return <EditItemClient item={result.item as any} />;
}
