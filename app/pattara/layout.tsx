import { redirect } from "next/navigation";
import AppearanceMenu from "@/components/layout/AppearanceMenu";
import Brand from "@/components/layout/Brand";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConsoleSidebar, { type NavGroup } from "@/components/layout/ConsoleSidebar";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "งานภัทร | PSU Store" };

export default async function PattaraLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null; email?: string | null; role?: string } | undefined;

  // The middleware already turns strangers away. This is the second lock, in
  // case a route ever slips past the matcher.
  if (!user?.id) redirect("/?login=1");
  if (user.role !== "PATTARA" && user.role !== "ADMIN") redirect("/");

  const t = await getT();

  const [waiting, overdue] = await Promise.all([
    prisma.lendingOrder.count({ where: { status: "REQUESTED" } }),
    prisma.lendingOrder.count({ where: { status: { in: ["OVERDUE", "LOST"] } } }),
  ]);

  const groups: NavGroup[] = [
    { items: [{ href: "/pattara", label: t("nav_overview"), icon: "chart", exact: true }] },
    {
      title: t("nav_group_lend"),
      items: [
        { href: "/pattara/items",    label: t("nav_inventory"), icon: "box" },
        { href: "/pattara/requests", label: t("nav_requests"),  icon: "clock", badge: waiting },
        { href: "/pattara/orders",   label: t("nav_loans"),     icon: "hands", badge: overdue, danger: true },
      ],
    },
    { title: t("nav_group_money"), items: [{ href: "/pattara/fund", label: t("nav_fund_short"), icon: "wallet" }] },
  ];

  return (
    <div className="ui-shell bw-scope flex flex-col">
      <header className="sticky top-0 z-50 bg-[var(--c-surface)] border-b border-[var(--hp-border)]">
        <div className="max-w-[1240px] mx-auto px-5 h-14 flex items-center gap-3 pl-14 md:pl-5">
          <Brand size={26} />
          <span className="text-[var(--hp-border-str)]" aria-hidden>/</span>
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--psu-blue)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 11V7a2 2 0 114 0v4m0 0V5.5a2 2 0 114 0V11m0 0V8.5a2 2 0 114 0V15a6 6 0 01-6 6h-2a6 6 0 01-6-6v-3.5a2 2 0 114 0V13" />
            </svg>
            {t("shell_office")}
          </span>
          {user.role === "ADMIN" && (
            <span className="ui-pill ui-pill-wait ml-1">{t("shell_as_admin")}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <AppearanceMenu />
            <a href="/borrow" className="ui-btn ui-btn-ghost ui-btn-sm">{t("shell_student_view")}</a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1240px] mx-auto w-full px-5 py-7 gap-6">
        <ConsoleSidebar
          title={t("shell_office_menu")}
          groups={groups}
          user={{ name: user.name ?? null, email: user.email ?? "" }}
          backHref="/borrow"
          backLabel={t("shell_student_view")}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
