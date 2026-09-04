import { notFound } from "next/navigation";
import { getBorrowOrder } from "@/lib/actions/borrow-orders";
import BorrowOrderClient from "@/app/borrow/orders/[id]/BorrowOrderClient";

export const dynamic  = "force-dynamic";
export const metadata = { title: "จัดการการยืม | งานภัทร" };

/**
 * The same order view the student sees, inside the office chrome.
 *
 * Sharing the component rather than writing a second one means the two sides
 * can never drift out of sync about what state an order is in — the actions it
 * offers already switch on who is looking.
 */
export default async function OfficeOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getBorrowOrder(id);
  if (!order) notFound();

  return <BorrowOrderClient order={order} backHref="/pattara/orders" />;
}
