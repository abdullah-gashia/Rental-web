import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/dictionaries";
import { getTr } from "@/lib/i18n/server";
interface Props {
  auditLog: Array<{
    action: string;
    adminName: string;
    note: string | null;
    createdAt: string;
  }>;
  itemCreatedAt: string;
}

const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                   "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function fmtDate(date: string, loc: Locale): string {
  const d = new Date(date);
  if (loc === "en") return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${MONTH_TH[d.getMonth()]} ${h}:${m}`;
}

export default async function AuditLogTimeline({ auditLog, itemCreatedAt }: Props) {
  const tr = await getTr();
  const __loc = await getLocale();
  // If no audit entries, show creation as the only event
  const entries = auditLog.length > 0
    ? auditLog
    : [{ action: "สร้างสินค้าใหม่", adminName: "ระบบ", note: null, createdAt: itemCreatedAt }];

  return (
    <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6">
      <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-4">
        {tr("บันทึกกิจกรรม")}
        {auditLog.length === 0 && (
          <span className="text-[var(--c-faint)] font-normal ml-1 text-xs">{tr("(ยังไม่มีบันทึก)")}</span>
        )}
      </h3>

      <div className="space-y-0">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex gap-3 text-sm relative">
            {/* Timeline line */}
            {idx < entries.length - 1 && (
              <div className="absolute left-[5px] top-[14px] bottom-0 w-[1px] bg-[var(--c-line)]" />
            )}

            {/* Dot */}
            <div className="w-[11px] flex-shrink-0 pt-[6px]">
              <div className={`w-[11px] h-[11px] rounded-full border-2 ${
                idx === 0
                  ? "bg-[var(--c-accent)] border-[var(--c-accent)]"
                  : "bg-[var(--c-surface)] border-[#d5d2cc]"
              }`} />
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
              <p className="text-[var(--c-ink-1)]">
                <span className="font-medium">{tr(entry.adminName)}</span>
                <span className="mx-1 text-[var(--c-faint)]">—</span>
                <span>{tr(entry.action)}</span>
              </p>
              {entry.note && (
                <p className="text-[var(--c-faint)] text-xs mt-0.5 italic">&ldquo;{tr(entry.note)}&rdquo;</p>
              )}
              <p className="text-[var(--c-faint)] text-xs mt-0.5">{fmtDate(entry.createdAt, __loc)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
