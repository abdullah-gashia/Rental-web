import { auth }     from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link          from "next/link";
import { prisma }    from "@/lib/prisma";
import {
  statusLabel, statusColor, RENTAL_STEPS, TERMINAL_BAD,
} from "../_lib/status";

export const dynamic  = "force-dynamic";
export const metadata = { title: "รายละเอียดการเช่า | Admin" };

// ─── Formatting helpers ───────────────────────────────────────────────────────

const dt = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("th-TH", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const day = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const baht = (n: number | null | undefined) =>
  n == null ? "—" : `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** One entry of RentalOrder.statusHistory, which is stored as loose JSON. */
type HistoryEntry = { status?: string; changedAt?: string; note?: string };

function readHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is HistoryEntry => !!e && typeof e === "object");
}

// ─── Small presentational pieces ──────────────────────────────────────────────

function Card({ title, children, right }: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-[#e5e3de] p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold text-[#333]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, strong = false }: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-[#f4f2ee] last:border-0">
      <span className="text-xs text-[#9a9590] flex-shrink-0">{label}</span>
      <span className={`text-xs text-right ${strong ? "font-bold text-[#111]" : "text-[#333]"}`}>
        {value}
      </span>
    </div>
  );
}

function Confirm({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
      ok ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
    }`}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function Photos({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] text-[#9a9590] mb-1.5">{label} ({urls.length})</p>
      <div className="flex gap-2 flex-wrap">
        {urls.map((u) => (
          <a key={u} href={u} target="_blank" rel="noopener noreferrer"
             className="w-20 h-20 rounded-lg border border-[#e5e3de] overflow-hidden bg-[#f4f5f7] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-contain" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminLendingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const admin = session?.user as { role?: string } | undefined;
  if (!admin || admin.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const order = await prisma.rentalOrder.findUnique({
    where: { id },
    include: {
      item: {
        select: {
          id: true, title: true, emoji: true, description: true, status: true,
          listingType: true, rentalRate: true, dailyRate: true, lateFeePerDay: true,
          securityDeposit: true, location: true, condition: true,
          category: { select: { nameTh: true } },
          images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        },
      },
      renter: { select: { id: true, name: true, email: true, phone: true, trustScore: true } },
      owner:  { select: { id: true, name: true, email: true, phone: true, trustScore: true } },
    },
  });

  if (!order) notFound();

  const history  = readHistory(order.statusHistory);
  const seen     = new Set(history.map((h) => h.status));
  const isBadEnd = TERMINAL_BAD.includes(order.status);
  const cover    = order.item.images[0]?.url ?? null;

  // How long the request has been sitting unanswered — the reason a stale
  // REQUESTED order eventually gets cancelled on its own.
  const waitingDays = order.status === "REQUESTED"
    ? Math.floor((Date.now() - order.createdAt.getTime()) / 86_400_000)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/lending" className="text-xs text-[#9a9590] hover:text-[#555] transition">
            ← ระบบปล่อยเช่า
          </Link>
          <h1 className="text-xl font-bold text-[#111] mt-1 flex items-center gap-2 flex-wrap">
            🔑 {order.item.title}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColor(order.status)}`}>
              {statusLabel(order.status)}
            </span>
          </h1>
          <p className="text-xs text-[#9a9590] mt-1 font-mono">{order.refCode}</p>
        </div>

        <Link
          href={`/rental/orders/${order.id}`}
          target="_blank"
          className="text-xs font-semibold text-[#e8500a] border border-[#e8500a]/30 bg-[#e8500a]/5 rounded-xl px-3.5 py-2 hover:bg-[#e8500a]/10 transition"
        >
          เปิดหน้าที่ผู้ใช้เห็น ↗
        </Link>
      </div>

      {/* ── Stale-request warning ──────────────────────────────────────── */}
      {order.status === "REQUESTED" && (
        <div className={`rounded-2xl px-4 py-3 border text-sm ${
          (waitingDays ?? 0) >= 5
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          ⏳ เจ้าของยังไม่ตอบรับ — รอมาแล้ว <span className="font-bold">{waitingDays} วัน</span>
          {order.expiresAt && (
            <> · ระบบจะยกเลิกและคืนเงินอัตโนมัติเมื่อ <span className="font-semibold">{dt(order.expiresAt)}</span></>
          )}
        </div>
      )}

      {/* ── Progress rail ──────────────────────────────────────────────── */}
      <Card title="ขั้นตอนการเช่า">
        {isBadEnd ? (
          <div className={`rounded-xl border px-4 py-3 text-sm ${statusColor(order.status)}`}>
            รายการนี้จบลงที่สถานะ <span className="font-bold">{statusLabel(order.status)}</span>
            {order.cancelReason && <> — {order.cancelReason}</>}
          </div>
        ) : (
          <ol className="flex flex-wrap gap-y-4">
            {RENTAL_STEPS.map((step, i) => {
              const done    = seen.has(step.key);
              const current = order.status === step.key;
              return (
                <li key={step.key} className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-center w-[86px] text-center">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${
                      current ? "bg-[#e8500a] border-[#e8500a] text-white"
                      : done   ? "bg-green-50 border-green-400 text-green-700"
                               : "bg-white border-[#e5e3de] text-[#c4c0b9]"
                    }`}>
                      {done && !current ? "✓" : i + 1}
                    </span>
                    <span className={`text-[10.5px] mt-1 leading-tight ${
                      current ? "font-bold text-[#e8500a]" : done ? "text-[#555]" : "text-[#c4c0b9]"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < RENTAL_STEPS.length - 1 && (
                    <span className={`hidden sm:block w-4 h-0.5 ${done ? "bg-green-300" : "bg-[#eae7e1]"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── The item itself ──────────────────────────────────────────── */}
        <Card
          title="สินค้าที่ปล่อยเช่า"
          right={
            // There is no standalone item route — the marketplace opens the
            // listing from a search on its exact title.
            <Link href={`/?q=${encodeURIComponent(order.item.title)}`} target="_blank"
                  className="text-[11px] text-[#e8500a] hover:underline">
              ดูประกาศ ↗
            </Link>
          }
        >
          <div className="flex gap-4">
            <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-[#f4f5f7] border border-[#e5e3de] overflow-hidden flex items-center justify-center text-3xl">
              {cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cover} alt={order.item.title} className="w-full h-full object-contain" />
                : (order.item.emoji ?? "📦")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#111]">{order.item.title}</p>
              <p className="text-xs text-[#9a9590] mt-0.5">
                {order.item.category.nameTh}
                {order.item.location ? ` · ${order.item.location}` : ""}
              </p>
              <p className="text-xs text-[#777] mt-2 line-clamp-3 leading-relaxed">
                {order.item.description}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Row label="สถานะสินค้าในตลาด" value={order.item.status} />
            <Row label="ประเภทประกาศ"      value={order.item.listingType === "RENT" ? "ให้เช่า" : "ขาย"} />
            <Row label="สภาพ"              value={order.item.condition ?? "—"} />
            <Row label="ค่าปรับคืนช้า/วัน"  value={baht(order.item.lateFeePerDay)} />
          </div>
        </Card>

        {/* ── Parties ──────────────────────────────────────────────────── */}
        <Card title="คู่สัญญา">
          <div className="space-y-4">
            {[
              { role: "ผู้เช่า",  u: order.renter, tint: "bg-blue-50 text-blue-700 border-blue-200"    },
              { role: "เจ้าของ", u: order.owner,  tint: "bg-purple-50 text-purple-700 border-purple-200" },
            ].map(({ role, u, tint }) => (
              <div key={role} className="rounded-xl border border-[#e5e3de] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${tint}`}>
                    {role}
                  </span>
                  <Link href={`/user/${u.id}`} target="_blank"
                        className="text-[11px] text-[#e8500a] hover:underline">
                    โปรไฟล์ ↗
                  </Link>
                </div>
                <p className="text-sm font-semibold text-[#111]">{u.name ?? "—"}</p>
                <p className="text-xs text-[#9a9590] break-all">{u.email ?? "—"}</p>
                <p className="text-xs text-[#9a9590]">
                  {u.phone ?? "ไม่ระบุเบอร์"} · คะแนนความน่าเชื่อถือ {u.trustScore}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Money ────────────────────────────────────────────────────── */}
        <Card title="การเงิน">
          <Row label="ค่าเช่า"                value={`${baht(order.dailyRate)}/วัน × ${order.rentalDays} วัน = ${baht(order.rentalFee)}`} />
          <Row label="ค่าธรรมเนียมแพลตฟอร์ม" value={baht(order.platformFee)} />
          <Row label="เงินมัดจำ"              value={baht(order.securityDeposit)} />
          <Row label="ยอดชำระรวม"            value={baht(order.totalPaid)} strong />
          <Row label="ค่าปรับคืนช้าสะสม"      value={order.lateFees   ? <span className="text-red-600 font-semibold">{baht(order.lateFees)}</span>   : "—"} />
          <Row label="ค่าเสียหาย"            value={order.damageFees ? <span className="text-red-600 font-semibold">{baht(order.damageFees)}</span> : "—"} />
          <Row label="คืนมัดจำแล้ว"           value={baht(order.depositRefund)} />
          <Row label="จ่ายเจ้าของแล้ว"         value={baht(order.ownerPayout)} />
        </Card>

        {/* ── Schedule ─────────────────────────────────────────────────── */}
        <Card title="กำหนดเวลา">
          <Row label="สร้างคำขอเมื่อ"  value={dt(order.createdAt)} />
          <Row label="คำขอหมดอายุ"     value={dt(order.expiresAt)} />
          <Row label="เริ่มเช่า"        value={day(order.rentalStartDate)} />
          <Row label="ครบกำหนดคืน"     value={day(order.rentalEndDate)} strong />
          <Row label="คืนจริงเมื่อ"     value={dt(order.actualReturnDate)} />
          <Row label="ต่ออายุแล้ว"      value={`${order.renewalCount} ครั้ง`} />
          <Row label="ยอมรับข้อตกลง"   value={dt(order.agreementAcceptedAt)} />
          {order.cancelledAt && <Row label="ยกเลิกเมื่อ" value={dt(order.cancelledAt)} />}
          {order.cancelReason && <Row label="เหตุผลที่ยกเลิก" value={order.cancelReason} />}
          <Row label="เสร็จสิ้นเมื่อ"    value={dt(order.completedAt)} />
        </Card>

        {/* ── Handshake #1 ─────────────────────────────────────────────── */}
        <Card
          title="การส่งมอบ (นัดรับ)"
          right={
            <span className="flex gap-1.5">
              <Confirm ok={order.pickupRenterConfirm} label="ผู้เช่า" />
              <Confirm ok={order.pickupOwnerConfirm}  label="เจ้าของ" />
            </span>
          }
        >
          <Row label="สถานที่"      value={order.pickupLocation ?? "—"} />
          <Row label="วันเวลานัด"    value={dt(order.pickupDateTime)} />
          <Row label="ส่งมอบจริง"    value={dt(order.actualPickupAt)} />
          <Row label="หมายเหตุ"     value={order.pickupNote ?? "—"} />
          <Row label="สภาพตอนรับ"   value={order.pickupConditionNote ?? "—"} />
          <Photos urls={order.pickupPhotos} label="รูปตอนส่งมอบ" />
        </Card>

        {/* ── Handshake #2 ─────────────────────────────────────────────── */}
        <Card
          title="การคืน (นัดคืน)"
          right={
            <span className="flex gap-1.5">
              <Confirm ok={order.returnRenterConfirm} label="ผู้เช่า" />
              <Confirm ok={order.returnOwnerConfirm}  label="เจ้าของ" />
            </span>
          }
        >
          <Row label="สถานที่"     value={order.returnLocation ?? "—"} />
          <Row label="วันเวลานัด"   value={dt(order.returnDateTime)} />
          <Row label="สภาพที่คืน"   value={order.returnCondition ?? "—"} />
          <Row label="หมายเหตุ"    value={order.returnConditionNote ?? order.returnNote ?? "—"} />
          <Photos urls={order.returnPhotos} label="รูปตอนคืน" />
        </Card>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────────── */}
      <Card title={`ประวัติสถานะทั้งหมด (${history.length})`}>
        {history.length === 0 ? (
          <p className="text-xs text-[#aaa] py-4 text-center">ยังไม่มีประวัติ</p>
        ) : (
          <ol className="space-y-0">
            {[...history].reverse().map((h, i) => (
              <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-[#e8500a]" : "bg-[#d5d1c9]"}`} />
                  {i < history.length - 1 && <span className="flex-1 w-px bg-[#eae7e1] my-1" />}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(h.status ?? "")}`}>
                      {statusLabel(h.status ?? "—")}
                    </span>
                    <span className="text-[11px] text-[#9a9590]">
                      {h.changedAt ? dt(new Date(h.changedAt)) : "—"}
                    </span>
                  </div>
                  {h.note && <p className="text-xs text-[#555] mt-1 leading-relaxed">{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* ── The agreement text both sides accepted ─────────────────────── */}
      {order.agreementText && (
        <Card title="ข้อตกลงการเช่าที่ทั้งสองฝ่ายยอมรับ">
          <pre className="text-[11.5px] leading-6 text-[#555] whitespace-pre-wrap font-sans bg-[#faf9f7] border border-[#f0ede7] rounded-xl p-4 max-h-72 overflow-y-auto">
            {order.agreementText}
          </pre>
        </Card>
      )}
    </div>
  );
}
