import { getOrderDetails } from "@/lib/actions/order-transitions";
import { redirect } from "next/navigation";
import OrderTrackingClient from "./OrderTrackingClient";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getOrderDetails(id);

  if ("error" in result) {
    redirect("/dashboard/orders");
  }

  return (
    <main className="min-h-screen bg-[#f1f5fb]">
      <OrderTrackingClient
        order={result.order}
        currentUserId={result.currentUserId}
      />
    </main>
  );
}
