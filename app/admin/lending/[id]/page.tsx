import { getTr } from "@/lib/i18n/server";
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
    <section className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold text-[var(--c-ink-1)]">{title}</h2>
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
      <span className="text-xs text-[var(--c-muted)] flex-shrink-0">{label}</span>
      <span className={`text-xs text-right ${strong ? "font-bold text-[var(--c-ink)]" : "text-[var(--c-ink-1)]"}`}>
        {value}
      </span>
    </div>
  );
}

function Confirm({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
      ok ? "bg-[var(--c-ok-soft)] text-[var(--c-ok)] border-[var(--c-ok-line)]" : "bg-[var(--c-subtle)] text-[var(--c-muted)] border-[var(--c-line)]"
    }`}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function Photos({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] text-[var(--c-muted)] mb-1.5">{label} ({urls.length})</p>
      <div className="flex gap-2 flex-wrap">
        {urls.map((u) => (
          <a key={u} href={u} target="_blank" rel="noopener noreferrer"
             className="w-20 h-20 rounded-lg border border-[var(--c-line)] overflow-hidden bg-[var(--c-subtle-2)] flex items-center justify-center">
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
  const tr = await getTr();
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
          <Link href="/admin/lending" className="text-xs text-[var(--c-muted)] hover:text-[var(--c-ink-2)] transition">{tr("← ระบบปล่อยเช่า")}</Link>
          <h1 className="text-xl font-bold text-[var(--c-ink)] mt-1 flex items-center gap-2 flex-wrap">
            🔑 {order.item.title}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColor(order.status)}`}>
              {statusLabel(order.status)}
            </span>
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-1 font-mono">{order.refCode}</p>
        </div>

        <Link
          href={`/rental/orders/${order.id}`}
          target="_blank"
          className="text-xs font-semibold text-[var(--c-accent)] border border-[var(--c-accent)]/30 bg-[var(--c-accent)]/5 rounded-xl px-3.5 py-2 hover:bg-[var(--c-accent)]/10 transition"
        >{tr("เปิดหน้าที่ผู้ใช้เห็น ↗")}</Link>
      </div>

      {/* ── Stale-request warning ──────────────────────────────────────── */}
      {order.status === "REQUESTED" && (
        <div className={`rounded-2xl px-4 py-3 border text-sm ${
          (waitingDays ?? 0) >= 5
            ? "bg-[var(--c-danger-soft)] border-[var(--c-danger-line)] text-[var(--c-danger)]"
            : "bg-[var(--c-warn-soft)] border-[var(--c-warn-line)] text-amber-800"
        }`}>{tr("⏳ เจ้าของยังไม่ตอบรับ — รอมาแล้ว")}<span className="font-bold">{waitingDays} วัน</span>
          {order.expiresAt && (
            <>{tr("· ระบบจะยกเลิกและคืนเงินอัตโนมัติเมื่อ")}<span className="font-semibold">{dt(order.expiresAt)}</span></>
          )}
        </div>
      )}

      {/* ── Progress rail ──────────────────────────────────────────────── */}
      <Card title={tr("ขั้นตอนการเช่า")}>
        {isBadEnd ? (
          <div className={`rounded-xl border px-4 py-3 text-sm ${statusColor(order.status)}`}>{tr("รายการนี้จบลงที่สถานะ")}<span className="font-bold">{statusLabel(order.status)}</span>
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
                      current ? "bg-[var(--c-accent)] border-[var(--c-accent)] text-white"
                      : done   ? "bg-[var(--c-ok-soft)] border-green-400 text-[var(--c-ok)]"
                               : "bg-[var(--c-surface)] border-[var(--c-line)] text-[var(--c-faint-2)]"
                    }`}>
                      {done && !current ? "✓" : i + 1}
                    </span>
                    <span className={`text-[10.5px] mt-1 leading-tight ${
                      current ? "font-bold text-[var(--c-accent)]" : done ? "text-[var(--c-ink-2)]" : "text-[var(--c-faint-2)]"
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
          title={tr("สินค้าที่ปล่อยเช่า")}
          right={
            // There is no standalone item route — the marketplace opens the
            // listing from a search on its exact title.
            <Link href={`/?q=${encodeURIComponent(order.item.title)}`} target="_blank"
                  className="text-[11px] text-[var(--c-accent)] hover:underline">{tr("ดูประกาศ ↗")}</Link>
          }
        >
          <div className="flex gap-4">
            <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-[var(--c-subtle-2)] border border-[var(--c-line)] overflow-hidden flex items-center justify-center text-3xl">
              {cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cover} alt={order.item.title} className="w-full h-full object-contain" />
                : (order.item.emoji ?? "📦")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--c-ink)]">{order.item.title}</p>
              <p className="text-xs text-[var(--c-muted)] mt-0.5">
                {order.item.category.nameTh}
                {order.item.location ? ` · ${order.item.location}` : ""}
              </p>
              <p className="text-xs text-[var(--c-ink-3)] mt-2 line-clamp-3 leading-relaxed">
                {order.item.description}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Row label={tr("สถานะสินค้าในตลาด")} value={order.item.status} />
            <Row label={tr("ประเภทประกาศ")}      value={order.item.listingType === "RENT" ? tr("ให้เช่า") : tr("ขาย")} />
            <Row label={tr("สภาพ")}              value={order.item.condition ?? "—"} />
            <Row label={tr("ค่าปรับคืนช้า/วัน")}  value={baht(order.item.lateFeePerDay)} />
          </div>
        </Card>

        {/* ── Parties ──────────────────────────────────────────────────── */}
        <Card title={tr("คู่สัญญา")}>
          <div className="space-y-4">
            {[
              { role: tr("ผู้เช่า"),  u: order.renter, tint: "bg-[var(--c-accent-soft)] text-[var(--c-accent-str)] border-[var(--c-line-str)]"    },
              { role: tr("เจ้าของ"), u: order.owner,  tint: "bg-purple-50 text-purple-700 border-purple-200" },
            ].map(({ role, u, tint }) => (
              <div key={role} className="rounded-xl border border-[var(--c-line)] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${tint}`}>
                    {role}
                  </span>
                  <Link href={`/user/${u.id}`} target="_blank"
                        className="text-[11px] text-[var(--c-accent)] hover:underline">{tr("โปรไฟล์ ↗")}</Link>
                </div>
                <p className="text-sm font-semibold text-[var(--c-ink)]">{u.name ?? "—"}</p>
                <p className="text-xs text-[var(--c-muted)] break-all">{u.email ?? "—"}</p>
                <p className="text-xs text-[var(--c-muted)]">
                  {u.phone ?? tr("ไม่ระบุเบอร์")} · คะแนนความน่าเชื่อถือ {u.trustScore}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Money ────────────────────────────────────────────────────── */}
        <Card title={tr("การเงิน")}>
          <Row label={tr("ค่าเช่า")}                value={tr("{0}/วัน × {1} วัน = {2}", [baht(order.dailyRate), order.rentalDays, baht(order.rentalFee)])} />
          <Row label={tr("ค่าธรรมเนียมแพลตฟอร์ม")} value={baht(order.platformFee)} />
          <Row label={tr("เงินมัดจำ")}              value={baht(order.securityDeposit)} />
          <Row label={tr("ยอดชำระรวม")}            value={baht(order.totalPaid)} strong />
          <Row label={tr("ค่าปรับคืนช้าสะสม")}      value={order.lateFees   ? <span className="text-[var(--c-danger)] font-semibold">{baht(order.lateFees)}</span>   : "—"} />
          <Row label={tr("ค่าเสียหาย")}            value={order.damageFees ? <span className="text-[var(--c-danger)] font-semibold">{baht(order.damageFees)}</span> : "—"} />
          <Row label={tr("คืนมัดจำแล้ว")}           value={baht(order.depositRefund)} />
          <Row label={tr("จ่ายเจ้าของแล้ว")}         value={baht(order.ownerPayout)} />
        </Card>

        {/* ── Schedule ─────────────────────────────────────────────────── */}
        <Card title={tr("กำหนดเวลา")}>
          <Row label={tr("สร้างคำขอเมื่อ")}  value={dt(order.createdAt)} />
          <Row label={tr("คำขอหมดอายุ")}     value={dt(order.expiresAt)} />
          <Row label={tr("เริ่มเช่า")}        value={day(order.rentalStartDate)} />
          <Row label={tr("ครบกำหนดคืน")}     value={day(order.rentalEndDate)} strong />
          <Row label={tr("คืนจริงเมื่อ")}     value={dt(order.actualReturnDate)} />
          <Row label={tr("ต่ออายุแล้ว")}      value={tr("{0} ครั้ง", [order.renewalCount])} />
          <Row label={tr("ยอมรับข้อตกลง")}   value={dt(order.agreementAcceptedAt)} />
          {order.cancelledAt && <Row label={tr("ยกเลิกเมื่อ")} value={dt(order.cancelledAt)} />}
          {order.cancelReason && <Row label={tr("เหตุผลที่ยกเลิก")} value={order.cancelReason} />}
          <Row label={tr("เสร็จสิ้นเมื่อ")}    value={dt(order.completedAt)} />
        </Card>

        {/* ── Handshake #1 ─────────────────────────────────────────────── */}
        <Card
          title={tr("การส่งมอบ (นัดรับ)")}
          right={
            <span className="flex gap-1.5">
              <Confirm ok={order.pickupRenterConfirm} label={tr("ผู้เช่า")} />
              <Confirm ok={order.pickupOwnerConfirm}  label={tr("เจ้าของ")} />
            </span>
          }
        >
          <Row label={tr("สถานที่")}      value={order.pickupLocation ?? "—"} />
          <Row label={tr("วันเวลานัด")}    value={dt(order.pickupDateTime)} />
          <Row label={tr("ส่งมอบจริง")}    value={dt(order.actualPickupAt)} />
          <Row label={tr("หมายเหตุ")}     value={order.pickupNote ?? "—"} />
          <Row label={tr("สภาพตอนรับ")}   value={order.pickupConditionNote ?? "—"} />
          <Photos urls={order.pickupPhotos} label={tr("รูปตอนส่งมอบ")} />
        </Card>

        {/* ── Handshake #2 ─────────────────────────────────────────────── */}
        <Card
          title={tr("การคืน (นัดคืน)")}
          right={
            <span className="flex gap-1.5">
              <Confirm ok={order.returnRenterConfirm} label={tr("ผู้เช่า")} />
              <Confirm ok={order.returnOwnerConfirm}  label={tr("เจ้าของ")} />
            </span>
          }
        >
          <Row label={tr("สถานที่")}     value={order.returnLocation ?? "—"} />
          <Row label={tr("วันเวลานัด")}   value={dt(order.returnDateTime)} />
          <Row label={tr("สภาพที่คืน")}   value={order.returnCondition ?? "—"} />
          <Row label={tr("หมายเหตุ")}    value={order.returnConditionNote ?? order.returnNote ?? "—"} />
          <Photos urls={order.returnPhotos} label={tr("รูปตอนคืน")} />
        </Card>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────────── */}
      <Card title={tr("ประวัติสถานะทั้งหมด ({0})", [history.length])}>
        {history.length === 0 ? (
          <p className="text-xs text-[var(--c-faint)] py-4 text-center">{tr("ยังไม่มีประวัติ")}</p>
        ) : (
          <ol className="space-y-0">
            {[...history].reverse().map((h, i) => (
              <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-[var(--c-accent)]" : "bg-[#d5d1c9]"}`} />
                  {i < history.length - 1 && <span className="flex-1 w-px bg-[#eae7e1] my-1" />}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(h.status ?? "")}`}>
                      {statusLabel(h.status ?? "—")}
                    </span>
                    <span className="text-[11px] text-[var(--c-muted)]">
                      {h.changedAt ? dt(new Date(h.changedAt)) : "—"}
                    </span>
                  </div>
                  {h.note && <p className="text-xs text-[var(--c-ink-2)] mt-1 leading-relaxed">{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* ── The agreement text both sides accepted ─────────────────────── */}
      {order.agreementText && (
        <Card title={tr("ข้อตกลงการเช่าที่ทั้งสองฝ่ายยอมรับ")}>
          <pre className="text-[11.5px] leading-6 text-[var(--c-ink-2)] whitespace-pre-wrap font-sans bg-[var(--c-subtle)] border border-[var(--c-line-soft)] rounded-xl p-4 max-h-72 overflow-y-auto">
            {order.agreementText}
          </pre>
        </Card>
      )}
    </div>
  );
}
