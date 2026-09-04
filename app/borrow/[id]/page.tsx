import { notFound } from "next/navigation";
import { getBorrowItem } from "@/lib/actions/borrow-items";
import BorrowItemClient from "./BorrowItemClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getBorrowItem(id);
  return { title: item ? `${item.title} | ยืมของ` : "ไม่พบอุปกรณ์" };
}

export default async function BorrowItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getBorrowItem(id);
  if (!item) notFound();

  return <BorrowItemClient item={item} />;
}
