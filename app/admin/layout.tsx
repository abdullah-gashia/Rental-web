import { auth }        from "@/lib/auth";
import { redirect }    from "next/navigation";
import AdminSidebar    from "./_components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id)                             redirect("/");
  if ((session.user as any).role !== "ADMIN")         redirect("/");

  const user = session.user as { name?: string | null; email?: string | null };

  return (
    <div className="min-h-screen bg-[#f7f6f3] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e3de] shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          {/* Left: logo — the hamburger button is rendered by AdminSidebar on mobile */}
          <div className="flex items-center gap-3 pl-10 md:pl-0">
            <a href="/" className="text-lg font-extrabold tracking-tighter">
              PSU<span style={{ color: "#e8500a" }}>.</span>STORE
            </a>
            <span className="text-[#e5e3de]">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#e8500a]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin Panel
            </span>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-5 py-8 gap-6">
        <AdminSidebar
          adminName={user.name ?? null}
          adminEmail={user.email ?? "admin"}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
