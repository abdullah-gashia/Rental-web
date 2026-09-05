import { getTr } from "@/lib/i18n/server";
import { getOfficeItems } from "@/lib/actions/borrow-items";
import { getPurchaseOptions } from "@/lib/actions/fund";
import OfficeItemsClient from "./OfficeItemsClient";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("คลังอุปกรณ์ | งานภัทร"),};
}

export default async function OfficeItemsPage() {
  const [items, purchases] = await Promise.all([
    getOfficeItems(),
    getPurchaseOptions(),
  ]);

  return <OfficeItemsClient items={items} purchases={purchases} />;
}
