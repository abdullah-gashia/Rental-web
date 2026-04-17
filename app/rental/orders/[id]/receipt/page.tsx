import { notFound }       from "next/navigation";
import { getRentalOrderDetail } from "@/lib/actions/rental-checkout";
import AutoPrint                from "./AutoPrint";
import PrintBar                 from "./PrintBar";

export const dynamic = "force-dynamic";

interface Props {
  params:      Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  SAME:         "สภาพเดิม — ไม่มีความเสียหาย",
  MINOR_DAMAGE: "เสียหายเล็กน้อย",
  MAJOR_DAMAGE: "เสียหายมาก",
  LOST:         "สูญหาย",
};

export default async function RentalReceiptPage({ params, searchParams }: Props) {
  const { id }   = await params;
  const { type } = await searchParams;
  const order    = await getRentalOrderDetail(id);
  if (!order) notFound();

  const isReturn   = type === "return";
  const item       = order.item;
  const fmtDate    = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    }) : "—";
  const today      = new Date().toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
  const refCode    = order.refCode.slice(0, 12).toUpperCase();

  return (
    <>
      <AutoPrint />
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 20mm 15mm; }
        }
        body { font-family: 'Noto Sans Thai', 'Sarabun', sans-serif; background: white; }
      `}</style>

      {/* Print action bar — hidden when printing */}
      <PrintBar title={`${isReturn ? "ใบเสร็จคืนสินค้า" : "สัญญาเช่า"} — ${order.item.title}`} />

      {/* Document */}
      <div className="min-h-screen bg-white pt-16 print:pt-0">
        <div className="max-w-[700px] mx-auto px-8 py-10 print:px-0 print:py-0">

          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-[#e8500a]">
            <div>
              <div className="text-2xl font-black text-[#e8500a] mb-1">PSU Store</div>
              <div className="text-xs text-gray-500">มหาวิทยาลัยสงขลานครินทร์</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-800">
                {isReturn ? "ใบเสร็จคืนสินค้า" : "สัญญาเช่าทรัพย์สิน"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {isReturn ? "Return Receipt" : "Rental Contract Agreement"}
              </div>
              <div className="text-xs text-gray-400 mt-1.5">
                เลขที่: {refCode}<br />
                วันที่: {today}
              </div>
            </div>
          </div>

          {/* Parties */}
          <section className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">คู่สัญญา</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">เจ้าของสินค้า (ผู้ให้เช่า)</div>
                <div className="font-semibold text-gray-800">{order.owner.name ?? "—"}</div>
                {order.owner.verificationStatus === "APPROVED" && (
                  <div className="text-xs text-green-600 mt-0.5">✅ ยืนยันตัวตนแล้ว</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">ผู้เช่า</div>
                <div className="font-semibold text-gray-800">{order.renter.name ?? "—"}</div>
                {order.renter.verificationStatus === "APPROVED" && (
                  <div className="text-xs text-green-600 mt-0.5">✅ ยืนยันตัวตนแล้ว</div>
                )}
              </div>
            </div>
          </section>

          {/* Item */}
          <section className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ทรัพย์สินที่เช่า</h2>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="font-semibold text-gray-800 text-base">{item.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.category?.nameTh}</div>
            </div>
          </section>

          {/* Rental period */}
          <section className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ระยะเวลาเช่า</h2>
            <table className="w-full text-sm">
              <tbody>
                <DocRow label="วันเริ่มเช่า"   value={fmtDate(order.rentalStartDate)} />
                <DocRow label="วันสิ้นสุดเช่า" value={fmtDate(order.rentalEndDate)} />
                <DocRow label="จำนวนวัน"        value={`${order.rentalDays} วัน`} />
                {order.actualPickupAt && (
                  <DocRow label="รับของจริง" value={fmtDate(order.actualPickupAt)} />
                )}
                {isReturn && order.actualReturnDate && (
                  <DocRow label="คืนของจริง" value={fmtDate(order.actualReturnDate)} />
                )}
              </tbody>
            </table>
          </section>

          {/* Financial summary */}
          <section className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">สรุปการเงิน</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <FinRow label={`ค่าเช่า (฿${order.dailyRate}/วัน × ${order.rentalDays} วัน)`}
                           value={`฿${order.rentalFee.toLocaleString()}`} />
                  <FinRow label="ค่าธรรมเนียมแพลตฟอร์ม (5%)"
                           value={`฿${order.platformFee.toLocaleString()}`} />
                  <FinRow label="เงินมัดจำ (ถือไว้ใน Escrow)"
                           value={`฿${order.securityDeposit.toLocaleString()}`} />
                  {order.lateFees > 0 && (
                    <FinRow label="ค่าปรับคืนล่าช้า"
                             value={`฿${order.lateFees.toLocaleString()}`} accent />
                  )}
                  {isReturn && order.damageFees > 0 && (
                    <FinRow label="ค่าเสียหาย"
                             value={`฿${order.damageFees.toLocaleString()}`} accent />
                  )}
                  <tr className="bg-gray-50 font-bold border-t border-gray-200">
                    <td className="px-4 py-3 text-gray-800">ยอดรวม</td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      ฿{order.totalPaid.toLocaleString()}
                    </td>
                  </tr>
                  {isReturn && order.depositRefund !== null && (
                    <FinRow label="เงินมัดจำที่คืนผู้เช่า"
                             value={`฿${order.depositRefund?.toLocaleString()}`} positive />
                  )}
                  {isReturn && order.ownerPayout !== null && (
                    <FinRow label="เงินที่เจ้าของได้รับ"
                             value={`฿${order.ownerPayout?.toLocaleString()}`} positive />
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Return condition (return receipt only) */}
          {isReturn && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">สภาพสินค้าเมื่อคืน</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-semibold text-gray-800">
                  {STATUS_LABEL[order.returnCondition ?? "SAME"] ?? order.returnCondition ?? "—"}
                </p>
                {order.returnConditionNote && (
                  <p className="text-gray-600 mt-1 text-xs">หมายเหตุ: {order.returnConditionNote}</p>
                )}
              </div>
            </section>
          )}

          {/* Agreement terms (contract only) */}
          {!isReturn && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">เงื่อนไขการเช่า</h2>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-1.5">
                <p>1. ผู้เช่าต้องดูแลสินค้าเสมือนเป็นของตนเองและคืนในสภาพเดิม</p>
                <p>2. หากสินค้าชำรุดเสียหาย ผู้เช่ายินยอมให้หักค่าเสียหายจากเงินมัดจำ</p>
                <p>3. หากสินค้าสูญหาย ยินยอมให้ริบเงินมัดจำทั้งจำนวน</p>
                <p>4. ค่าปรับคืนช้า: ฿{(item.lateFeePerDay ?? 0) > 0
                  ? (item.lateFeePerDay ?? 0).toLocaleString()
                  : "0"}/วัน
                </p>
                <p>5. ข้อตกลงนี้มีผลผูกพันตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 537–571</p>
                <p>6. แพลตฟอร์มใช้ Digital Handshake เป็นหลักฐานในการตัดสินข้อพิพาท</p>
              </div>
            </section>
          )}

          {/* Signatures */}
          <section className="mb-10">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">ลายเซ็นยืนยัน</h2>
            <div className="grid grid-cols-2 gap-8">
              <SigBlock
                role={isReturn ? "เจ้าของสินค้า" : "ผู้เช่า"}
                name={isReturn ? order.owner.name ?? "—" : order.renter.name ?? "—"}
                dateStr={isReturn ? fmtDate(order.actualReturnDate) : fmtDate(order.actualPickupAt)}
              />
              <SigBlock
                role={isReturn ? "ผู้เช่า" : "เจ้าของสินค้า"}
                name={isReturn ? order.renter.name ?? "—" : order.owner.name ?? "—"}
                dateStr={isReturn ? fmtDate(order.actualReturnDate) : fmtDate(order.actualPickupAt)}
              />
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-400">
            เอกสารนี้ออกโดยระบบ PSU Store — {today} — รหัสอ้างอิง: {refCode}
            <br />
            ข้อมูลยืนยันผ่าน Digital Handshake ระบบ Two-Party Confirmation
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DocRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 text-gray-500 w-40">{label}</td>
      <td className="py-2 font-medium text-gray-800">{value}</td>
    </tr>
  );
}

function FinRow({
  label, value, accent, positive,
}: {
  label: string; value: string; accent?: boolean; positive?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className={`px-4 py-2.5 ${accent ? "text-red-600" : positive ? "text-green-700" : "text-gray-600"}`}>
        {label}
      </td>
      <td className={`px-4 py-2.5 text-right font-medium ${accent ? "text-red-600" : positive ? "text-green-700" : "text-gray-800"}`}>
        {value}
      </td>
    </tr>
  );
}

function SigBlock({ role, name, dateStr }: { role: string; name: string; dateStr: string }) {
  return (
    <div>
      <div className="h-16 border-b-2 border-gray-300 mb-2" />
      <p className="text-xs font-semibold text-gray-700">{role}</p>
      <p className="text-xs text-gray-500">{name}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">วันที่: {dateStr}</p>
    </div>
  );
}
