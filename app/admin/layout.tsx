import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if ((session.user as any).role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-[#f7f6f3] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e3de] shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-lg font-extrabold tracking-tighter">
              PSU<span style={{ color: "#e8500a" }}>.</span>STORE
            </a>
            <span className="text-[#e5e3de]">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#e8500a]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin Panel
            </span>
          </div>
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
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-5 py-8 gap-6">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-52 flex-shrink-0 gap-1">
          <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest mb-2 px-3">เมนู</p>
          <a
            href="/admin/approvals"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#e8500a]/10 text-[#e8500a] text-sm font-semibold"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            ตรวจสอบสินค้า
          </a>
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#555] text-sm font-medium hover:bg-[#f0ede7] transition"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            หน้าหลัก
          </a>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
