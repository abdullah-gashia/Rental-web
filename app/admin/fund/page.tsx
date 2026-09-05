import { getTr } from "@/lib/i18n/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFundSummary, getFundEntries } from "@/lib/actions/fund";
import MoneyValue from "../dashboard/_components/MoneyValue";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("กองทุนงานภัทร | Admin"),};
}

const SOURCE_LABEL: Record<string, string> = {
  PURCHASE: "ซื้ออุปกรณ์", MAINTENANCE: "ซ่อมบำรุง",
  DONATION: "เงินบริจาค", ADJUSTMENT: "ปรับยอด",
};

export default async function AdminFundPage() {
  const tr = await getTr();
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") redirect("/");

  const [summary, entries, officeCount, itemCount] = await Promise.all([
    getFundSummary(),
    getFundEntries(),
    prisma.user.count({ where: { role: "PATTARA" } }),
    prisma.lendingItem.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-ink)] flex items-center gap-2">{tr("💙 กองทุนงานภัทร")}</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">{tr("ค่าธรรมเนียมที่เก็บได้ทั้งหมดเข้ากองทุนนี้ 100% เพื่อซื้ออุปกรณ์ให้นักศึกษายืมฟรี")}</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: tr("รายรับสะสม"), value: <MoneyValue amount={summary.incomeTotal + summary.otherIn} />, color: "text-[var(--c-accent)]" },
          { label: tr("ใช้ไปแล้ว"),  value: <MoneyValue amount={summary.spentTotal} />,                    color: "text-[var(--c-danger)]" },
          { label: tr("คงเหลือ"),    value: <MoneyValue amount={summary.balance} />,                       color: "text-[var(--c-ok)]" },
          { label: tr("อุปกรณ์ในคลัง"), value: tr("{0} ชิ้น", [itemCount]),                                        color: "text-[var(--c-ink)]" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-4">
            <p className="text-xs text-[var(--c-muted)] mb-1">{s.label}</p>
            <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Where the income comes from */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <h2 className="text-sm font-bold text-[var(--c-ink-1)] mb-4">{tr("ที่มาของรายรับ")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            [tr("ค่าธรรมเนียมการซื้อขาย"), summary.incomeFromSales],
            [tr("ค่าธรรมเนียมการเช่า"),    summary.incomeFromRentals],
            [tr("เงินบริจาค / ปรับยอด"),   summary.otherIn],
          ].map(([k, v]) => (
            <div key={k as string}>
              <p className="text-xs text-[var(--c-muted)]">{k}</p>
              <p className="text-base font-bold text-[var(--c-ink)] mt-0.5">
                <MoneyValue amount={v as number} />
              </p>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-[var(--c-muted)] mt-4 leading-relaxed">{tr("รายรับคำนวณสดจากคำสั่งซื้อและการเช่าที่จบสมบูรณ์แล้ว จึงตรงกับความจริงเสมอ และไม่มีการบันทึกซ้ำซ้อน · มีบัญชีเจ้าหน้าที่งานภัทร {0} บัญชี", [officeCount])}</p>
      </div>

      {/* Ledger */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[var(--c-ink-1)]">{tr("รายการใช้จ่าย ({0})", [entries.length])}</h2>
          <Link href="/pattara/fund" className="text-xs font-semibold text-[var(--c-accent)] hover:underline">{tr("เปิดหน้าจัดการของงานภัทร →")}</Link>
        </div>

        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--c-faint)]">{tr("ยังไม่มีการใช้จ่ายจากกองทุน")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--c-subtle)] border-b border-[var(--c-line)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("วันที่")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("รายการ")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("ประเภท")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("บันทึกโดย")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("จำนวน")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line-soft)]">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--c-ink-3)]">
                      {new Date(e.occurredAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      {e.note}
                      {e.receiptUrl && (
                        <>
                          {" · "}
                          <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--c-accent)] hover:underline">{tr("ใบเสร็จ")}</a>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--c-ink-2)]">{tr(SOURCE_LABEL[e.source] ?? e.source)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--c-ink-3)]">{e.recordedBy ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      e.kind === "OUT" ? "text-[var(--c-danger)]" : "text-[var(--c-ok)]"
                    }`}>
                      {e.kind === "OUT" ? "−" : "+"}฿{e.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
