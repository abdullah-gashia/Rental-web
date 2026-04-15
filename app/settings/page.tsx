import { auth }        from "@/lib/auth";
import { redirect }    from "next/navigation";
import { getSettingsData } from "./actions";
import SettingsLayout  from "./_components/SettingsLayout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "การตั้งค่า — PSU Store",
  description: "จัดการโปรไฟล์ ที่อยู่จัดส่ง การแจ้งเตือน และความเป็นส่วนตัวของคุณ",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  // Redirect admins — they manage settings via Admin Panel
  if ((session.user as any).role === "ADMIN") redirect("/admin/dashboard");

  const { user } = await getSettingsData();
  const sp = await searchParams;
  const activeTab = (typeof sp.tab === "string" ? sp.tab : "profile") as string;

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e3de] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-lg font-extrabold tracking-tighter">
              PSU<span style={{ color: "#e8500a" }}>.</span>STORE
            </a>
            <span className="text-[#e5e3de]">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#555]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              การตั้งค่า
            </span>
          </div>

          <a
            href="/"
            className="text-sm text-[#777] hover:text-[#333] transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับหน้าหลัก
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <SettingsLayout userData={user} activeTab={activeTab} />
      </div>
    </div>
  );
}
