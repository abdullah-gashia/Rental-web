import { getTr } from "@/lib/i18n/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { EscrowStatus, ItemStatus } from "@prisma/client";
import { getI18n } from "@/lib/i18n/server";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("ภาพรวม | บัญชีของฉัน"),};
}

/**
 * The seller's landing page.
 *
 * There wasn't one — /dashboard had no index, so the "แดชบอร์ด" link in the
 * user menu went nowhere and a seller's first stop was whichever sub-page they
 * happened to remember. This answers the only question they actually arrive
 * with: is there anything I need to do right now?
 */

const NEEDS_SELLER: EscrowStatus[] = [
  "PENDING_CONFIRMATION", "FUNDS_HELD", "AWAITING_SHIPMENT",
  "MEETUP_SCHEDULED", "MEETUP_ARRANGED",
];

const money = (n: number, nf: string) =>
  `฿${n.toLocaleString(nf, { maximumFractionDigits: 2 })}`;

export default async function SellerOverview() {
  const tr = await getTr();
  const session = await auth();
  if (!session?.user?.id) redirect("/?login=1");
  const uid = session.user.id;
  const { locale, t } = await getI18n();
  const nf = locale === "en" ? "en-US" : "th-TH";

  const [
    me, liveItems, pendingItems, soldItems,
    needsAction, completedAgg, ratingAgg,
    rentalActive, borrowOpen, recentOrders,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { name: true, walletBalance: true, trustScore: true, verificationStatus: true },
    }),
    prisma.item.count({ where: { sellerId: uid, status: { in: ["APPROVED", "ACTIVE"] as ItemStatus[] } } }),
    prisma.item.count({ where: { sellerId: uid, status: "PENDING" } }),
    prisma.item.count({ where: { sellerId: uid, status: "SOLD" } }),
    prisma.escrowOrder.count({ where: { sellerId: uid, status: { in: NEEDS_SELLER } } }),
    prisma.escrowOrder.aggregate({
      where: {
        sellerId: uid,
        status: { in: ["COMPLETED", "MEETUP_COMPLETED", "MEETUP_CASH_COMPLETED", "COD_DELIVERED"] as EscrowStatus[] },
      },
      _sum: { sellerPayout: true },
      _count: { _all: true },
    }),
    prisma.review.aggregate({ where: { revieweeId: uid }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.rentalOrder.count({
      where: { ownerId: uid, status: { in: ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "ACTIVE", "OVERDUE", "RETURN_SCHEDULED"] } },
    }),
    prisma.lendingOrder.count({
      where: {
        borrowerId: uid,
        status: { notIn: ["COMPLETED", "COMPLETED_WITH_DEDUCTION", "REJECTED", "CANCELLED", "LOST"] },
      },
    }),
    prisma.escrowOrder.findMany({
      where: { sellerId: uid },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, status: true, amount: true, createdAt: true,
        item:  { select: { title: true, images: { select: { url: true }, take: 1, orderBy: { order: "asc" } } } },
        buyer: { select: { name: true } },
      },
    }),
  ]);

  const earned  = completedAgg._sum.sellerPayout ?? 0;
  const sales   = completedAgg._count._all;
  const rating  = ratingAgg._avg.rating;
  const reviews = ratingAgg._count.rating;
  const verified = me?.verificationStatus === "APPROVED";

  // The whole point of the page: a short list of things only this person can
  // clear, in the order they should clear them.
  const todo = [
    needsAction  > 0 && { n: needsAction,  label: t("ov_todo_orders"),  href: "/dashboard/orders",   bad: true },
    rentalActive > 0 && { n: rentalActive, label: t("ov_todo_rentals"), href: "/dashboard/rentals",  bad: false },
    pendingItems > 0 && { n: pendingItems, label: t("ov_todo_pending"), href: "/dashboard/my-items", bad: false },
    borrowOpen   > 0 && { n: borrowOpen,   label: t("ov_todo_borrows"), href: "/dashboard/borrows",  bad: false },
  ].filter(Boolean) as { n: number; label: string; href: string; bad: boolean }[];

  return (
    <div className="flex flex-col gap-6">
      <header className="ui-head">
        <div>
          <p className="ui-eyebrow mb-1.5">{t("shell_my_account")}</p>
          <h1>{t("ov_hello", { name: me?.name ?? "" })}</h1>
          <p>
            {todo.length === 0
              ? t("ov_nothing")
              : t("ov_waiting", { n: todo.reduce((sum, x) => sum + x.n, 0) })}
          </p>
        </div>
        <a href="/" className="ui-btn ui-btn-primary">{t("ov_new_listing")}</a>
      </header>

      {/* ── Not verified yet ─────────────────────────────────────────────── */}
      {!verified && (
        <div className="ui-note ui-note-warn flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong>{t("ov_unverified")}</strong> — {t("ov_unverified_sub")}
          </span>
          <a href="/profile/verify" className="ui-btn ui-btn-ghost ui-btn-sm">{t("ov_verify_cta")}</a>
        </div>
      )}

      {/* ── What needs doing ─────────────────────────────────────────────── */}
      {todo.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="ui-card-head">
            <h2>{t("ov_todo")}</h2>
          </div>
          <div>
            {todo.map((row) => (
              <a
                key={row.href}
                href={row.href}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--hp-border)] last:border-0 hover:bg-[var(--psu-sky)] transition-colors"
              >
                <span className={`ui-pill ${row.bad ? "ui-pill-bad" : "ui-pill-wait"} ui-num`}>{row.n}</span>
                <span className="text-[13.5px] text-[var(--hp-ink)] flex-1">{tr(row.label)}</span>
                <span className="text-[13px] text-[var(--psu-blue)] font-semibold">{t("c_manage")} →</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── The numbers that matter to a seller ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <a href="/dashboard/my-items" className="ui-stat">
          <p className="ui-stat-k">{t("ov_live_listings")}</p>
          <p className="ui-stat-v">{liveItems}</p>
          <p className="ui-stat-sub">{t("ov_sold_n", { n: soldItems })}</p>
        </a>
        <a href="/dashboard/orders" className="ui-stat">
          <p className="ui-stat-k">{t("ov_sales")}</p>
          <p className="ui-stat-v">{sales}</p>
          <p className="ui-stat-sub">{t("ov_earned", { amount: money(earned, nf) })}</p>
        </a>
        <div className="ui-stat">
          <p className="ui-stat-k">{t("ov_wallet")}</p>
          <p className="ui-stat-v">{money(me?.walletBalance ?? 0, nf)}</p>
          <p className="ui-stat-sub">{t("ov_wallet_sub")}</p>
        </div>
        <div className="ui-stat">
          <p className="ui-stat-k">{t("ov_rating")}</p>
          <p className="ui-stat-v">
            {reviews > 0 ? (rating ?? 0).toFixed(1) : "—"}
          </p>
          <p className="ui-stat-sub">
            {reviews > 0
              ? t("ov_rating_sub", { n: reviews, score: me?.trustScore ?? 100 })
              : t("ov_no_reviews")}
          </p>
        </div>
      </div>

      {/* ── Latest orders ────────────────────────────────────────────────── */}
      <section className="ui-card overflow-hidden">
        <div className="ui-card-head">
          <h2>{t("ov_recent")}</h2>
          <a href="/dashboard/orders" className="text-[12.5px] font-semibold text-[var(--psu-blue)] hover:underline">
            {t("c_view_all")} →
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <div className="ui-empty">
            <div className="ui-empty-icon">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
              </svg>
            </div>
            <h3>{t("ov_no_orders")}</h3>
            <p>{t("ov_no_orders_sub")}</p>
          </div>
        ) : (
          <div>
            {recentOrders.map((o) => (
              <a
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center gap-3 px-5 py-3 border-b border-[var(--hp-border)] last:border-0 hover:bg-[var(--psu-sky)] transition-colors"
              >
                <div className="ui-thumb w-11 h-11">
                  {o.item.images[0]
                    ? <img src={o.item.images[0].url} alt="" />
                    : <span className="text-[15px] opacity-30">📦</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-[var(--hp-ink)] truncate">{o.item.title}</p>
                  <p className="text-[11.5px] text-[var(--hp-muted)]">
                    {o.buyer.name ?? t("shell_user")} ·{" "}
                    {new Date(o.createdAt).toLocaleDateString(nf, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="ui-num text-[13px] font-semibold text-[var(--hp-ink)] flex-shrink-0">
                  {money(o.amount, nf)}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
