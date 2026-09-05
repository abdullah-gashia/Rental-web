import { auth } from "@/lib/auth";
import AppearanceMenu from "@/components/layout/AppearanceMenu";
import Brand from "@/components/layout/Brand";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ConsoleSidebar, { type NavGroup } from "@/components/layout/ConsoleSidebar";
import { getT } from "@/lib/i18n/server";

/**
 * The signed-in console.
 *
 * Not "the seller dashboard", even though that is what it was called: the
 * orders page here has always held both sides of the market, so a buyer who
 * came to check their delivery landed on a page labelled for sellers. The nav
 * now separates buying from selling and links each straight to its own tab.
 *
 * The counts are the point of the sidebar: they say where the work is before
 * anything is clicked.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/?login=1");

  const user = session.user as { id: string; name?: string | null; email?: string | null };
  const t = await getT();

  const [pendingItems, toShip, buying, activeRentals, openBorrows] = await Promise.all([
    prisma.item.count({ where: { sellerId: user.id, status: "PENDING" } }),
    prisma.escrowOrder.count({
      where: {
        sellerId: user.id,
        status: { in: ["FUNDS_HELD", "PENDING_CONFIRMATION", "AWAITING_SHIPMENT", "MEETUP_SCHEDULED", "MEETUP_ARRANGED"] },
      },
    }),
    prisma.escrowOrder.count({
      where: {
        buyerId: user.id,
        status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED", "CANCELLED_BY_ADMIN", "MEETUP_CASH_COMPLETED", "COD_DELIVERED"] },
      },
    }),
    prisma.rentalOrder.count({
      where: {
        ownerId: user.id,
        status: { in: ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "ACTIVE", "OVERDUE", "RETURN_SCHEDULED"] },
      },
    }),
    prisma.lendingOrder.count({
      where: {
        borrowerId: user.id,
        status: { notIn: ["COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED", "CANCELLED", "LOST"] },
      },
    }),
  ]);

  const groups: NavGroup[] = [
    { items: [{ href: "/dashboard", label: t("nav_overview"), icon: "home", exact: true }] },
    {
      title: t("nav_group_buy"),
      items: [
        { href: "/dashboard/orders?tab=buying", label: t("nav_my_orders"),  icon: "cart",  badge: buying },
        { href: "/dashboard/borrows",           label: t("nav_my_borrows"), icon: "hands", badge: openBorrows },
      ],
    },
    {
      title: t("nav_group_sell"),
      items: [
        { href: "/dashboard/my-items",           label: t("nav_my_listings"), icon: "box", badge: pendingItems },
        { href: "/dashboard/orders?tab=selling", label: t("nav_my_sales"),    icon: "tag", badge: toShip },
        { href: "/dashboard/rentals",            label: t("nav_my_rentals"),  icon: "key", badge: activeRentals },
      ],
    },
    {
      title: t("nav_group_acct"),
      items: [{ href: "/settings", label: t("nav_settings"), icon: "gear" }],
    },
  ];

  return (
    <div className="ui-shell flex flex-col">
      <header className="sticky top-0 z-50 bg-[var(--c-surface)] border-b border-[var(--hp-border)]">
        <div className="max-w-[1200px] mx-auto px-5 h-14 flex items-center gap-3 pl-14 md:pl-5">
          <Brand size={26} />
          <span className="text-[var(--hp-border-str)]" aria-hidden>/</span>
          <span className="text-[13.5px] font-semibold text-[var(--psu-blue)]">{t("shell_my_account")}</span>

          <div className="ml-auto flex items-center gap-2">
            <AppearanceMenu />
            <a href="/" className="ui-btn ui-btn-ghost ui-btn-sm">{t("shell_storefront")}</a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1200px] mx-auto w-full px-5 py-7 gap-6">
        <ConsoleSidebar
          title={t("shell_menu")}
          backLabel={t("shell_back_store")}
          groups={groups}
          user={{ name: user.name ?? null, email: user.email ?? "" }}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
