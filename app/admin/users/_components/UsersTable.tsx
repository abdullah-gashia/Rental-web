"use client";

import { useState, useTransition } from "react";
import type { UserRow }             from "../../_lib/types";
import { formatThaiDate }           from "../../_lib/utils";
import StatusBadge                  from "../../_components/StatusBadge";
import ConfirmDialog                from "../../_components/ConfirmDialog";
import { banUser, unbanUser, updateUserRole } from "../actions";

interface Props {
  rows: UserRow[];
}

export default function UsersTable({ rows }: Props) {
  const [pending, startTransition] = useTransition();

  // ── Dialog state ────────────────────────────────────────────────────────────
  type DialogKind = "ban" | "unban" | "role";
  const [dialog, setDialog] = useState<{
    kind:   DialogKind;
    userId: string;
    label:  string;
    newRole?: "ADMIN" | "STUDENT";
  } | null>(null);

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  function handleConfirm() {
    if (!dialog) return;
    startTransition(async () => {
      let res;
      if (dialog.kind === "ban")   res = await banUser(dialog.userId);
      else if (dialog.kind === "unban") res = await unbanUser(dialog.userId);
      else res = await updateUserRole(dialog.userId, dialog.newRole!);
      setDialog(null);
      showToast(res.success, res.success ? res.message : res.error);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center text-[#aaa] text-sm">ไม่พบผู้ใช้งาน</div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[600] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!dialog}
        title={
          dialog?.kind === "ban"   ? "แบนผู้ใช้นี้?" :
          dialog?.kind === "unban" ? "ปลดแบนผู้ใช้นี้?" :
          "เปลี่ยนบทบาท?"
        }
        description={
          dialog?.kind === "ban"
            ? `${dialog.label} จะถูกแบนและไม่สามารถเข้าสู่ระบบได้`
            : dialog?.kind === "unban"
            ? `${dialog?.label} จะสามารถเข้าสู่ระบบได้อีกครั้ง`
            : `เปลี่ยนบทบาทของ ${dialog?.label} เป็น ${dialog?.newRole === "ADMIN" ? "แอดมิน" : "นักศึกษา"}`
        }
        confirmLabel={dialog?.kind === "ban" ? "แบน" : "ยืนยัน"}
        danger={dialog?.kind === "ban"}
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e3de] bg-[#faf9f7]">
              <th className="text-left px-4 py-3 font-semibold text-[#555] w-[260px]">ผู้ใช้</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">บทบาท</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">สถานะ</th>
              <th className="text-right px-4 py-3 font-semibold text-[#555]">คะแนน</th>
              <th className="text-right px-4 py-3 font-semibold text-[#555]">สินค้า</th>
              <th className="text-right px-4 py-3 font-semibold text-[#555]">คำสั่งซื้อ</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">สมัครเมื่อ</th>
              <th className="text-left px-4 py-3 font-semibold text-[#555]">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede7]">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-[#faf9f7] transition group">
                {/* User info */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d] flex items-center justify-center text-white text-xs font-bold">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#111] truncate max-w-[180px]">
                        {u.name ?? "—"}
                      </p>
                      <p className="text-xs text-[#9a9590] truncate max-w-[180px]">{u.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  <StatusBadge status={u.role} type="role" />
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={u.isBanned ? "BANNED" : "ACTIVE"} type="user" />
                </td>

                {/* Trust score */}
                <td className="px-4 py-3 text-right font-medium text-[#333]">
                  <span className={u.trustScore < 50 ? "text-red-600" : u.trustScore < 80 ? "text-yellow-600" : "text-green-700"}>
                    {u.trustScore}
                  </span>
                </td>

                {/* Item count */}
                <td className="px-4 py-3 text-right text-[#555]">{u.itemCount}</td>

                {/* Order count */}
                <td className="px-4 py-3 text-right text-[#555]">{u.orderCount}</td>

                {/* Created */}
                <td className="px-4 py-3 text-[#777] whitespace-nowrap">
                  {formatThaiDate(u.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <ActionsDropdown
                    user={u}
                    onBan={() => setDialog({ kind: "ban",   userId: u.id, label: u.name ?? u.email })}
                    onUnban={() => setDialog({ kind: "unban", userId: u.id, label: u.name ?? u.email })}
                    onRole={(r) => setDialog({ kind: "role", userId: u.id, label: u.name ?? u.email, newRole: r })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Actions dropdown ─────────────────────────────────────────────────────────

function ActionsDropdown({
  user, onBan, onUnban, onRole,
}: {
  user:    UserRow;
  onBan:   () => void;
  onUnban: () => void;
  onRole:  (r: "ADMIN" | "STUDENT") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0ede7] transition text-[#555]"
        aria-label="เมนูการจัดการ"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-44 bg-white rounded-xl border border-[#e5e3de] shadow-lg py-1">
            {user.isBanned ? (
              <MenuItem
                label="ปลดแบน"
                icon="✅"
                onClick={() => { setOpen(false); onUnban(); }}
              />
            ) : (
              <MenuItem
                label="แบนผู้ใช้"
                icon="🚫"
                danger
                onClick={() => { setOpen(false); onBan(); }}
              />
            )}
            <div className="my-1 border-t border-[#f0ede7]" />
            {user.role !== "ADMIN" && (
              <MenuItem
                label="เลื่อนเป็นแอดมิน"
                icon="👑"
                onClick={() => { setOpen(false); onRole("ADMIN"); }}
              />
            )}
            {user.role !== "STUDENT" && (
              <MenuItem
                label="ลดเป็นนักศึกษา"
                icon="🎓"
                onClick={() => { setOpen(false); onRole("STUDENT"); }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ label, icon, danger = false, onClick }: {
  label:   string;
  icon:    string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f7f6f3] transition ${
        danger ? "text-red-600" : "text-[#333]"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
