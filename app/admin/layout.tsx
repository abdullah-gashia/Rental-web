import { auth }     from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma }   from "@/lib/prisma";
import ConsoleSidebar, { type NavGroup } from "@/components/layout/ConsoleSidebar";

/**
 * The admin console.
 *
 * The nav used to be nine emoji in a flat list with no grouping, so finding
 * anything meant reading all of them. It is now sorted by what an admin is
 * actually doing — moderating, running the marketplace, or looking after
 * people — with live counts on the queues that hold work.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id)                     redirect("/");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/");

  const user = session.user as { name?: string | null; email?: string | null };

  const [pendingKyc, pendingItems, openDisputes, openReports, waitingRentals] =
    await Promise.all([
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.item.count({ where: { status: "PENDING" } }),
      prisma.dispute.count({ where: { status: "OPEN" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.rentalOrder.count({ where: { status: "REQUESTED" } }),
    ]);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/admin/dashboard", label: "ภาพรวม", icon: "chart" },
      ],
    },
    {
      title: "งานที่ต้องตรวจ",
      items: [
        { href: "/admin/approvals",     label: "ตรวจสอบสินค้า",  icon: "check",  badge: pendingItems },
        { href: "/admin/verifications", label: "ยืนยันตัวตน KYC", icon: "search", badge: pendingKyc },
        { href: "/admin/disputes",      label: "ข้อพิพาท",        icon: "alert",  badge: openDisputes, danger: true },
      ],
    },
    {
      title: "ตลาด",
      items: [
        { href: "/admin/items",    label: "สินค้า",         icon: "box" },
        { href: "/admin/trending", label: "สินค้ามาแรง",     icon: "flame" },
        { href: "/admin/orders",   label: "คำสั่งซื้อ",       icon: "cart" },
        { href: "/admin/lending",  label: "ระบบปล่อยเช่า",    icon: "key",  badge: waitingRentals },
      ],
    },
    {
      title: "ผู้คนและกองทุน",
      items: [
        { href: "/admin/users",     label: "ผู้ใช้งาน",       icon: "users",  badge: openReports, danger: true },
        { href: "/admin/fund",      label: "กองทุนงานภัทร",   icon: "hands" },
        { href: "/admin/broadcast", label: "ส่งอีเมลถึงทุกคน", icon: "mail" },
      ],
    },
  ];

  return (
    <div className="ui-shell flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--hp-border)]">
        <div className="max-w-[1280px] mx-auto px-5 h-14 flex items-center gap-3 pl-14 md:pl-5">
          <a href="/" className="text-[15px] font-extrabold tracking-tighter text-[var(--psu-navy)]">
            PSU<span className="text-[var(--psu-blue)]">.</span>STORE
          </a>
          <span className="text-[var(--hp-border-str)]" aria-hidden>/</span>
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--psu-blue)]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 5 6v5.5c0 4.3 2.9 8.3 7 9.5 4.1-1.2 7-5.2 7-9.5V6z" />
              <path d="M9.5 12l1.8 1.8L15 10" />
            </svg>
            แผงผู้ดูแลระบบ
          </span>

          <a href="/" className="ui-btn ui-btn-ghost ui-btn-sm ml-auto">เปิดหน้าร้าน</a>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1280px] mx-auto w-full px-5 py-7 gap-6">
        <ConsoleSidebar
          title="เมนูผู้ดูแล"
          groups={groups}
          user={{ name: user.name ?? null, email: user.email ?? "admin" }}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
