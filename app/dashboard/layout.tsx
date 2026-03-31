import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e3de] shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-lg font-extrabold tracking-tighter">
              PSU<span style={{ color: "#e8500a" }}>.</span>STORE
            </a>
            <span className="text-[#e5e3de]">/</span>
            <span className="text-sm font-medium text-[#555]">แดชบอร์ด</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-1.5 text-sm text-[#555] hover:text-[#111] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับหน้าหลัก
            </a>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
