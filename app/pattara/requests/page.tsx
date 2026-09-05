import { getTr } from "@/lib/i18n/server";
import { getOfficeOrders } from "@/lib/actions/borrow-orders";
import { prisma } from "@/lib/prisma";
import RequestQueueClient from "./RequestQueueClient";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("คำขอยืม | งานภัทร"),};
}

export default async function RequestsPage() {
  const orders = await getOfficeOrders("waiting");

  // A borrower's history is the single most useful thing when deciding, so it
  // is fetched here rather than making staff click through to a profile.
  const ids = orders.map((o) => o.borrower.id);
  const past = ids.length
    ? await prisma.lendingOrder.groupBy({
        by: ["borrowerId", "status"],
        where: { borrowerId: { in: ids } },
        _count: { _all: true },
      })
    : [];

  const historyFor: Record<string, { completed: number; late: number; open: number }> = {};
  for (const id of ids) historyFor[id] = { completed: 0, late: 0, open: 0 };
  for (const row of past) {
    const h = historyFor[row.borrowerId];
    if (!h) continue;
    if (row.status === "COMPLETED" || row.status === "COMPLETED_WITH_DEDUCTION") h.completed += row._count._all;
    else if (row.status === "OVERDUE" || row.status === "LOST") h.late += row._count._all;
    else if (!["REJECTED", "CANCELLED"].includes(row.status)) h.open += row._count._all;
  }

  return <RequestQueueClient orders={orders} history={historyFor} />;
}
