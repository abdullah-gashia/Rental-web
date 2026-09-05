"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import Link from "next/link";
import Image from "next/image";
import type { VerificationListItem } from "../actions";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "รอตรวจสอบ", cls: "bg-[var(--c-warn-soft)] text-[var(--c-warn)]" },
  APPROVED: { label: "อนุมัติแล้ว", cls: "bg-emerald-100 text-[var(--c-ok)]" },
  REJECTED: { label: "ปฏิเสธแล้ว", cls: "bg-[var(--c-danger-soft)] text-[var(--c-danger)]" },
};

interface Props {
  requests: VerificationListItem[];
  filter: string;
}

export default function VerificationTable({ requests, filter }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--c-muted)]">
        <p className="text-4xl mb-3">📭</p>
        <p className="font-medium">ไม่มีคำขอ{filter === "PENDING" ? tr("ที่รอตรวจสอบ") : ""}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--c-line)] text-left text-[var(--c-muted)]">
            <th className="pb-3 font-medium pr-4">{tr("ผู้ใช้")}</th>
            <th className="pb-3 font-medium pr-4">{tr("รหัส PSU")}</th>
            <th className="pb-3 font-medium pr-4">{tr("ประเภท")}</th>
            <th className="pb-3 font-medium pr-4">{tr("ส่งเมื่อ")}</th>
            <th className="pb-3 font-medium pr-4">{tr("สถานะ")}</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--c-line-soft)]">
          {requests.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
            const date = new Date(r.submittedAt).toLocaleDateString("th-TH", {
              day: "numeric", month: "short", year: "numeric",
            });

            return (
              <tr key={r.id} className="hover:bg-[var(--c-canvas)] transition">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[var(--c-line)] flex-shrink-0">
                      {r.user.image ? (
                        <Image src={r.user.image} alt="" fill className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--c-ink-2)]">
                          {r.user.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--c-ink)] leading-tight">{r.user.name ?? "—"}</p>
                      <p className="text-xs text-[var(--c-muted)]">{r.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-[var(--c-ink-1)]">
                  {r.psuIdNumber.slice(0, 3)}{"•".repeat(r.psuIdNumber.length - 3)}
                </td>
                <td className="py-3 pr-4 text-[var(--c-ink-2)]">
                  {r.psuIdType === "STUDENT" ? tr("นักศึกษา") : tr("บุคลากร")}
                </td>
                <td className="py-3 pr-4 text-[var(--c-muted)]">{date}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls}`}>
                    {tr(meta.label)}
                  </span>
                </td>
                <td className="py-3">
                  <Link
                    href={`/admin/verifications/${r.id}`}
                    className="px-3 py-1.5 bg-[var(--c-ink)] text-white text-xs rounded-lg hover:bg-[var(--c-ink-1)] transition"
                  >{tr("ตรวจสอบ →")}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
