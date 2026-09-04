import { getBorrowCatalogue, getBorrowStats } from "@/lib/actions/borrow-items";
import { getPublicFundStats } from "@/lib/actions/fund";
import { currentUser } from "@/lib/permissions";
import BorrowCatalogueClient from "./BorrowCatalogueClient";

export const dynamic  = "force-dynamic";
export const metadata = {
  title: "ยืมของ | PSU Store",
  description: "ยืมอุปกรณ์การเรียนฟรีจากงานภัทร ไม่มีค่ามัดจำ ไม่มีค่าเช่า",
};

export default async function BorrowPage() {
  const [items, stats, fund, me] = await Promise.all([
    getBorrowCatalogue(),
    getBorrowStats(),
    getPublicFundStats(),
    currentUser(),
  ]);

  return (
    <BorrowCatalogueClient
      items={items}
      stats={stats}
      fund={fund}
      viewerRole={me?.role ?? null}
    />
  );
}
