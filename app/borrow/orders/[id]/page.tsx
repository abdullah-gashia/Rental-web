import { getTr } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { getBorrowOrder } from "@/lib/actions/borrow-orders";
import BorrowOrderClient from "./BorrowOrderClient";
import BorrowOrderShell from "./BorrowOrderShell";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("ติดตามการยืม | PSU Store"),};
}

export default async function BorrowOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getBorrowOrder(id);
  if (!order) notFound();

  return (
    <BorrowOrderShell>
      <BorrowOrderClient order={order} backHref="/dashboard/borrows" />
    </BorrowOrderShell>
  );
}
