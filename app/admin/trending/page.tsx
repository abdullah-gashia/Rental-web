import { getTr } from "@/lib/i18n/server";
import { auth }    from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminFeaturedItems } from "@/lib/actions/featured";
import TrendingManager from "./_components/TrendingManager";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("จัดการสินค้ามาแรง | Admin"),};
}

export default async function AdminTrendingPage() {
  const tr = await getTr();
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/");

  const featuredItems = await getAdminFeaturedItems("trending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-ink)] flex items-center gap-2">{tr("🔥 จัดการสินค้ามาแรง")}</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">{tr("เลือกสินค้าที่จะแสดงในหน้าแรก (สูงสุด 10 รายการ)")}</p>
      </div>

      <TrendingManager initialItems={featuredItems} />
    </div>
  );
}
