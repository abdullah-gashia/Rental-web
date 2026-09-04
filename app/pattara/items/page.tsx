import { getOfficeItems } from "@/lib/actions/borrow-items";
import { getPurchaseOptions } from "@/lib/actions/fund";
import OfficeItemsClient from "./OfficeItemsClient";

export const dynamic  = "force-dynamic";
export const metadata = { title: "คลังอุปกรณ์ | งานภัทร" };

export default async function OfficeItemsPage() {
  const [items, purchases] = await Promise.all([
    getOfficeItems(),
    getPurchaseOptions(),
  ]);

  return <OfficeItemsClient items={items} purchases={purchases} />;
}
