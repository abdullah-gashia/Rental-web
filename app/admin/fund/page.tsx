import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFundSummary, getFundEntries } from "@/lib/actions/fund";
import MoneyValue from "../dashboard/_components/MoneyValue";

export const dynamic  = "force-dynamic";
export const metadata = { title: "กองทุนงานภัทร | Admin" };

const SOURCE_LABEL: Record<string, string> = {
  PURCHASE: "ซื้ออุปกรณ์", MAINTENANCE: "ซ่อมบำรุง",
  DONATION: "เงินบริจาค", ADJUSTMENT: "ปรับยอด",
};

export default async function AdminFundPage() {
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
        <h1 className="text-xl font-bold text-[#0f1e35] flex items-center gap-2">💙 กองทุนงานภัทร</h1>
        <p className="text-sm text-[#64748b] mt-1">
          ค่าธรรมเนียมที่เก็บได้ทั้งหมดเข้ากองทุนนี้ 100% เพื่อซื้ออุปกรณ์ให้นักศึกษายืมฟรี
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "รายรับสะสม", value: <MoneyValue amount={summary.incomeTotal + summary.otherIn} />, color: "text-blue-600" },
          { label: "ใช้ไปแล้ว",  value: <MoneyValue amount={summary.spentTotal} />,                    color: "text-red-600" },
          { label: "คงเหลือ",    value: <MoneyValue amount={summary.balance} />,                       color: "text-emerald-600" },
          { label: "อุปกรณ์ในคลัง", value: `${itemCount} ชิ้น`,                                        color: "text-[#0f1e35]" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#dfe7f2] p-4">
            <p className="text-xs text-[#64748b] mb-1">{s.label}</p>
            <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Where the income comes from */}
      <div className="bg-white rounded-2xl border border-[#dfe7f2] p-5">
        <h2 className="text-sm font-bold text-[#1e2d47] mb-4">ที่มาของรายรับ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ["ค่าธรรมเนียมการซื้อขาย", summary.incomeFromSales],
            ["ค่าธรรมเนียมการเช่า",    summary.incomeFromRentals],
            ["เงินบริจาค / ปรับยอด",   summary.otherIn],
          ].map(([k, v]) => (
            <div key={k as string}>
              <p className="text-xs text-[#64748b]">{k}</p>
              <p className="text-base font-bold text-[#0f1e35] mt-0.5">
                <MoneyValue amount={v as number} />
              </p>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-[#64748b] mt-4 leading-relaxed">
          รายรับคำนวณสดจากคำสั่งซื้อและการเช่าที่จบสมบูรณ์แล้ว จึงตรงกับความจริงเสมอ
          และไม่มีการบันทึกซ้ำซ้อน · มีบัญชีเจ้าหน้าที่งานภัทร {officeCount} บัญชี
        </p>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-2xl border border-[#dfe7f2] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[#1e2d47]">รายการใช้จ่าย ({entries.length})</h2>
          <Link href="/pattara/fund" className="text-xs font-semibold text-[#2563eb] hover:underline">
            เปิดหน้าจัดการของงานภัทร →
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#94a3b8]">
            ยังไม่มีการใช้จ่ายจากกองทุน
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f9fd] border-b border-[#dfe7f2]">
                  <th className="text-left px-4 py-3 font-semibold text-[#3d4d66]">วันที่</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3d4d66]">รายการ</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3d4d66]">ประเภท</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3d4d66]">บันทึกโดย</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#3d4d66]">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaf0f8]">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[#5b6b82]">
                      {new Date(e.occurredAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      {e.note}
                      {e.receiptUrl && (
                        <>
                          {" · "}
                          <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563eb] hover:underline">
                            ใบเสร็จ
                          </a>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#3d4d66]">{SOURCE_LABEL[e.source] ?? e.source}</td>
                    <td className="px-4 py-3 text-xs text-[#5b6b82]">{e.recordedBy ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      e.kind === "OUT" ? "text-red-600" : "text-emerald-700"
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
