"use client";

import Link from "next/link";
import Image from "next/image";
import type { VerificationListItem } from "../actions";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "รอตรวจสอบ", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "ปฏิเสธแล้ว", cls: "bg-red-100 text-red-700" },
};

interface Props {
  requests: VerificationListItem[];
  filter: string;
}

export default function VerificationTable({ requests, filter }: Props) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-[#9a9590]">
        <p className="text-4xl mb-3">📭</p>
        <p className="font-medium">ไม่มีคำขอ{filter === "PENDING" ? "ที่รอตรวจสอบ" : ""}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e5e3de] text-left text-[#9a9590]">
            <th className="pb-3 font-medium pr-4">ผู้ใช้</th>
            <th className="pb-3 font-medium pr-4">รหัส PSU</th>
            <th className="pb-3 font-medium pr-4">ประเภท</th>
            <th className="pb-3 font-medium pr-4">ส่งเมื่อ</th>
            <th className="pb-3 font-medium pr-4">สถานะ</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0ede7]">
          {requests.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
            const date = new Date(r.submittedAt).toLocaleDateString("th-TH", {
              day: "numeric", month: "short", year: "numeric",
            });

            return (
              <tr key={r.id} className="hover:bg-[#f7f6f3] transition">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#e5e3de] flex-shrink-0">
                      {r.user.image ? (
                        <Image src={r.user.image} alt="" fill className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#555]">
                          {r.user.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#111] leading-tight">{r.user.name ?? "—"}</p>
                      <p className="text-xs text-[#9a9590]">{r.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-[#333]">
                  {r.psuIdNumber.slice(0, 3)}{"•".repeat(r.psuIdNumber.length - 3)}
                </td>
                <td className="py-3 pr-4 text-[#555]">
                  {r.psuIdType === "STUDENT" ? "นักศึกษา" : "บุคลากร"}
                </td>
                <td className="py-3 pr-4 text-[#9a9590]">{date}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="py-3">
                  <Link
                    href={`/admin/verifications/${r.id}`}
                    className="px-3 py-1.5 bg-[#111] text-white text-xs rounded-lg hover:bg-[#333] transition"
                  >
                    ตรวจสอบ →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
