import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PostLendingForm from "./_components/PostLendingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "ลงรายการให้ยืม | PSU Store" };

export default async function PostLendingPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user) redirect("/auth/signin");
  if (user.verificationStatus !== "APPROVED") redirect("/profile/verify");

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <nav className="flex items-center gap-1.5 text-xs text-[#aaa] mb-5">
          <Link href="/lending" className="hover:text-[#555]">ระบบปล่อยเช่า</Link>
          <span>/</span>
          <span className="text-[#555] font-medium">ลงรายการใหม่</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#111]">📦 ลงรายการให้ยืม</h1>
          <p className="text-sm text-[#777] mt-1">
            แบ่งปันของที่คุณมีให้เพื่อนนักศึกษายืมใช้ พร้อมมัดจำค้ำประกัน
          </p>
        </div>

        <PostLendingForm />
      </div>
    </div>
  );
}
