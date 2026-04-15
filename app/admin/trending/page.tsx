import { auth }    from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminFeaturedItems } from "@/lib/actions/featured";
import TrendingManager from "./_components/TrendingManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "จัดการสินค้ามาแรง | Admin" };

export default async function AdminTrendingPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/");

  const featuredItems = await getAdminFeaturedItems("trending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111] flex items-center gap-2">
          🔥 จัดการสินค้ามาแรง
        </h1>
        <p className="text-sm text-[#9a9590] mt-1">
          เลือกสินค้าที่จะแสดงในหน้าแรก (สูงสุด 10 รายการ)
        </p>
      </div>

      <TrendingManager initialItems={featuredItems} />
    </div>
  );
}
