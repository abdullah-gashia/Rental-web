import { getTr } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVerificationRequests } from "./actions";
import VerificationTable from "./_components/VerificationTable";
import Link from "next/link";

export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("ยืนยันตัวตน | Admin"),};
}
export const dynamic = "force-dynamic";

type Filter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const TABS: { label: string; value: Filter }[] = [
  { label: "รอตรวจสอบ", value: "PENDING" },
  { label: "อนุมัติแล้ว", value: "APPROVED" },
  { label: "ปฏิเสธแล้ว", value: "REJECTED" },
  { label: "ทั้งหมด",    value: "ALL" },
];

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const tr = await getTr();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const filter = (["PENDING","APPROVED","REJECTED","ALL"].includes(sp.filter ?? "")
    ? sp.filter
    : "PENDING") as Filter;

  const requests = await getVerificationRequests(filter);

  // Counts for tab badges
  const counts = await prisma.verificationRequest.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--c-ink)]">{tr("ยืนยันตัวตน KYC")}</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">{tr("ตรวจสอบคำขอยืนยันตัวตนของผู้ใช้")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--c-line-soft)] p-1 rounded-xl w-fit">
        {TABS.map((tab) => {
          const count = tab.value === "ALL"
            ? Object.values(countMap).reduce((a, b) => a + b, 0)
            : (countMap[tab.value] ?? 0);
          const isActive = filter === tab.value;

          return (
            <Link
              key={tab.value}
              href={`/admin/verifications?filter=${tab.value}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-[var(--c-surface)] text-[var(--c-ink)] shadow-sm"
                  : "text-[var(--c-muted)] hover:text-[var(--c-ink-2)]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive && tab.value === "PENDING"
                    ? "bg-[var(--c-warn-soft)] text-[var(--c-warn)]"
                    : "bg-[var(--c-line)] text-[var(--c-ink-2)]"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6">
        <VerificationTable requests={requests} filter={filter} />
      </div>
    </div>
  );
}
