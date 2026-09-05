"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import type { UserRow }             from "../../_lib/types";
import { formatThaiDate }           from "../../_lib/utils";
import StatusBadge                  from "../../_components/StatusBadge";
import ConfirmDialog                from "../../_components/ConfirmDialog";
import UserDetailPanel              from "./UserDetailPanel";
import { banUser, unbanUser, updateUserRole } from "../actions";

interface Props {
  rows: UserRow[];
}

export default function UsersTable({ rows }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [pending, startTransition] = useTransition();

  // ── Dialog state ────────────────────────────────────────────────────────────
  type DialogKind = "ban" | "unban" | "role";
  const [dialog, setDialog] = useState<{
    kind:   DialogKind;
    userId: string;
    label:  string;
    newRole?: "ADMIN" | "STUDENT" | "PATTARA";
  } | null>(null);

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Detail panel state ──────────────────────────────────────────────────────
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

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
      <div className="py-20 text-center text-[var(--c-faint)] text-sm">{tr("ไม่พบผู้ใช้งาน")}</div>
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
          dialog?.kind === "ban"   ? tr("แบนผู้ใช้นี้?") :
          dialog?.kind === "unban" ? tr("ปลดแบนผู้ใช้นี้?") :
          tr("เปลี่ยนบทบาท?")
        }
        description={
          dialog?.kind === "ban"
            ? tr("{0} จะถูกแบนและไม่สามารถเข้าสู่ระบบได้", [dialog.label])
            : dialog?.kind === "unban"
            ? tr("{0} จะสามารถเข้าสู่ระบบได้อีกครั้ง", [dialog?.label])
            : tr("เปลี่ยนบทบาทของ {0} เป็น {1}", [dialog?.label, dialog?.newRole === "ADMIN"   ? "แอดมิน"
              : dialog?.newRole === "PATTARA" ? tr("บัญชีหน่วยงานงานภัทร — จะซื้อ ขาย หรือเช่าไม่ได้อีก")
              : "นักศึกษา"])
        }
        confirmLabel={dialog?.kind === "ban" ? tr("แบน") : tr("ยืนยัน")}
        danger={dialog?.kind === "ban"}
        loading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />

      {/* Detail Panel */}
      {detailUserId && (
        <UserDetailPanel
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          showToast={showToast}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-line)] bg-[var(--c-subtle)]">
              <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)] w-[260px]">ผู้ใช้</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("บทบาท")}</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("สถานะ")}</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("คะแนน")}</th>
              <th className="text-left  px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("ดาว")}</th>
              <th className="text-center px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("รีพอร์ต")}</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("สินค้า")}</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("คำสั่งซื้อ")}</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("สมัครเมื่อ")}</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--c-ink-2)]">{tr("การจัดการ")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-line-soft)]">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-[var(--c-subtle)] transition group">
                {/* User info */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-lite)] flex items-center justify-center text-white text-xs font-bold">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--c-ink)] truncate max-w-[180px]">
                        {u.name ?? "—"}
                      </p>
                      <p className="text-xs text-[var(--c-muted)] truncate max-w-[180px]">{u.email}</p>
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
                <td className="px-4 py-3 text-right font-medium text-[var(--c-ink-1)]">
                  <span className={u.trustScore < 50 ? "text-[var(--c-danger)]" : u.trustScore < 80 ? "text-[var(--c-warn)]" : "text-[var(--c-ok)]"}>
                    {u.trustScore}
                  </span>
                </td>

                {/* Star rating from reviews */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {u.reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Stars rating={u.avgRating ?? 0} />
                      <span className="text-xs font-semibold text-[var(--c-ink-1)]">
                        {(u.avgRating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-[11px] text-[var(--c-muted)]">({u.reviewCount})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--c-faint-2)]">{tr("ยังไม่มีรีวิว")}</span>
                  )}
                </td>

                {/* Open abuse reports */}
                <td className="px-4 py-3 text-center">
                  {u.openReportCount > 0 && u.role !== "ADMIN" ? (
                    <button
                      onClick={() => setDetailUserId(u.id)}
                      title={tr("เปิดดูรายงาน")}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] text-[var(--c-danger)] text-xs font-bold hover:bg-[var(--c-danger-soft)] transition"
                    >
                      🚩 {u.openReportCount}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--c-faint-2)]">—</span>
                  )}
                </td>

                {/* Item count */}
                <td className="px-4 py-3 text-right text-[var(--c-ink-2)]">{u.itemCount}</td>

                {/* Order count */}
                <td className="px-4 py-3 text-right text-[var(--c-ink-2)]">{u.orderCount}</td>

                {/* Created */}
                <td className="px-4 py-3 text-[var(--c-ink-3)] whitespace-nowrap">
                  {formatThaiDate(u.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <ActionsDropdown
                    user={u}
                    onView={() => setDetailUserId(u.id)}
                    onEdit={() => setDetailUserId(u.id)}
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
  user, onView, onEdit, onBan, onUnban, onRole,
}: {
  user:    UserRow;
  onView:  () => void;
  onEdit:  () => void;
  onBan:   () => void;
  onUnban: () => void;
  onRole:  (r: "ADMIN" | "STUDENT" | "PATTARA") => void;
}) {
  const tr = useLocaleStore((s) => s.tr);
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // An admin account is off-limits from this menu. Banning, editing or
  // demoting the person who runs the panel is how you end up with a site that
  // has no administrator at all, and there is no way back in from that.
  // The server actions refuse the same thing, so this is convenience, not the
  // protection itself.
  const isAdmin = user.role === "ADMIN";

  // The table sits inside overflow-x-auto, which clips an absolutely
  // positioned menu — the dropdown opened but was never visible. Render it in
  // a portal at fixed coordinates instead so nothing can crop it.
  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen(true);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--c-line-soft)] transition text-[var(--c-ink-2)]"
        aria-label={tr("เมนูการจัดการ")}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[400]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[401] w-48 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] shadow-lg py-1"
            style={{ top: pos.top, right: pos.right }}
          >
            {isAdmin ? (
              <div className="px-3 py-2.5 text-xs text-[var(--c-muted)] leading-relaxed">{tr("🛡️ บัญชีผู้ดูแลระบบ")}<br />
                <span className="text-[11px]">{tr("ไม่สามารถแก้ไข แบน หรือลดสิทธิ์ได้")}</span>
              </div>
            ) : (
              <>
                <MenuItem
                  label={tr("ดูรายละเอียด")}
                  icon="👁️"
                  onClick={() => { setOpen(false); onView(); }}
                />
                <MenuItem
                  label={tr("แก้ไขข้อมูล")}
                  icon="✏️"
                  onClick={() => { setOpen(false); onEdit(); }}
                />

                <div className="my-1 border-t border-[var(--c-line-soft)]" />

                {/* Ban / Unban */}
                {user.isBanned ? (
                  <MenuItem
                    label={tr("ปลดแบน")}
                    icon="✅"
                    onClick={() => { setOpen(false); onUnban(); }}
                  />
                ) : (
                  <MenuItem
                    label={tr("แบนผู้ใช้")}
                    icon="🚫"
                    danger
                    onClick={() => { setOpen(false); onBan(); }}
                  />
                )}

                <div className="my-1 border-t border-[var(--c-line-soft)]" />

                <MenuItem
                  label={tr("เลื่อนเป็นแอดมิน")}
                  icon="👑"
                  onClick={() => { setOpen(false); onRole("ADMIN"); }}
                />
                {user.role === "PATTARA" ? (
                  <MenuItem
                    label={tr("กลับเป็นนักศึกษา")}
                    icon="🎓"
                    onClick={() => { setOpen(false); onRole("STUDENT"); }}
                  />
                ) : (
                  <MenuItem
                    label={tr("ตั้งเป็นบัญชีงานภัทร")}
                    icon="💙"
                    onClick={() => { setOpen(false); onRole("PATTARA"); }}
                  />
                )}
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

/** Five stars with the fractional part shown as a half-filled last star. */
function Stars({ rating }: { rating: number }) {
  const tr = useLocaleStore((s) => s.tr);
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="inline-flex text-[13px] leading-none" aria-label={tr("{0} ดาว", [rating.toFixed(1)])}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rounded ? "text-amber-400" : "text-[var(--c-line)]"}>
          {s - 0.5 === rounded ? "⯨" : "★"}
        </span>
      ))}
    </span>
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
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--c-canvas)] transition ${
        danger ? "text-[var(--c-danger)]" : "text-[var(--c-ink-1)]"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
