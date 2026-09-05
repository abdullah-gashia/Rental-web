"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { updateTrackingPreference, clearViewHistory, exportMyData } from "../actions";
import DeleteAccountDialog from "./DeleteAccountDialog";
import ChangePasswordDialog from "./ChangePasswordDialog";

interface Props {
  userData: {
    email: string;
    createdAt: string;
    trackingEnabled: boolean;
    escrowBalance: number;
  };
  showToast: (ok: boolean, msg: string) => void;
}

const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                   "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function SecurityTab({ userData, showToast }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const [tracking, setTracking] = useState(userData.trackingEnabled);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleToggleTracking = () => {
    const newVal = !tracking;
    setTracking(newVal);
    startTransition(async () => {
      const res = await updateTrackingPreference(newVal);
      showToast(res.success, res.success ? tr(res.message) : tr(res.error));
      if (!res.success) setTracking(!newVal); // revert on failure
    });
  };

  const handleClearHistory = () => {
    startTransition(async () => {
      const res = await clearViewHistory();
      showToast(res.success, res.success ? tr(res.message) : tr(res.error));
    });
  };

  const handleExport = () => {
  const tr = useLocaleStore((s) => s.tr);
    startTransition(async () => {
      const res = await exportMyData();
      if (res.success) {
        // Download as JSON file
        const blob = new Blob([res.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `psu-store-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(true, tr("ดาวน์โหลดข้อมูลเรียบร้อยแล้ว"));
      } else {
        showToast(false, tr(res.error));
      }
    });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[var(--c-ink)] flex items-center gap-2">
        <span>🔒</span> บัญชีและความปลอดภัย
      </h2>

      {/* Login info */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)]">{tr("การเข้าสู่ระบบ")}</h3>
        <div className="p-4 bg-[var(--c-subtle)] rounded-xl border border-[var(--c-line)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--c-ink-2)]">{tr("วิธีเข้าสู่ระบบ")}</span>
            <span className="text-sm font-medium text-[var(--c-ink-1)]">PSU Account (Credentials)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--c-ink-2)]">{tr("สมัครเมื่อ")}</span>
            <span className="text-sm font-medium text-[var(--c-ink-1)]">{formatThaiDate(userData.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--c-line)] pt-3 mt-1">
            <div>
              <span className="text-sm text-[var(--c-ink-2)]">{tr("รหัสผ่าน")}</span>
              <p className="text-[11px] text-[var(--c-muted)]">{tr("ต้องยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสใหม่")}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-surface)] text-xs font-semibold text-[var(--c-ink-1)] hover:bg-[var(--c-canvas)] transition flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 11.001-.001M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
              </svg>{tr("เปลี่ยนรหัสผ่าน")}</button>
          </div>
        </div>
      </div>

      {/* Browsing history */}
      <div className="border-t border-[var(--c-line)] pt-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)]">{tr("ประวัติการเข้าชม")}</h3>
        <p className="text-xs text-[var(--c-muted)]">{tr("ระบบจดจำสินค้าที่คุณเคยดูเพื่อแนะนำสินค้าที่ตรงใจ")}</p>

        <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-[var(--c-subtle)] border border-[var(--c-line)]">
          <div>
            <p className="text-sm font-medium text-[var(--c-ink-1)]">{tr("เปิดการบันทึกประวัติ")}</p>
            <p className="text-[11px] text-[var(--c-muted)]">{tr("ใช้สำหรับแนะนำสินค้าอัตโนมัติ")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={tracking}
            onClick={handleToggleTracking}
            disabled={pending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
              tracking ? "bg-[var(--c-accent)]" : "bg-[#ddd]"
            } disabled:opacity-50`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--c-surface)] shadow transition duration-200 ease-in-out mt-0.5 ${
                tracking ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={pending}
          className="flex items-center gap-2 text-sm text-[var(--c-ink-2)] hover:text-[var(--c-danger)] transition disabled:opacity-50"
        >
          🗑️ ล้างประวัติการเข้าชมทั้งหมด
          {pending && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        </button>
      </div>

      {/* Data export */}
      <div className="border-t border-[var(--c-line)] pt-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)]">{tr("ข้อมูลของฉัน")}</h3>
        <button
          onClick={handleExport}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-medium text-[var(--c-ink-1)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
        >
          📥 ดาวน์โหลดข้อมูลของฉัน
          {pending && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        </button>
        <p className="text-[11px] text-[var(--c-muted)] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>{tr("ดาวน์โหลดข้อมูลทั้งหมดที่เกี่ยวข้องกับบัญชีของคุณ (JSON)")}</p>
      </div>

      {/* Danger zone */}
      <div className="border-t border-[var(--c-line)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--c-danger)] mb-3 flex items-center gap-1.5">{tr("⚠️ โซนอันตราย")}</h3>
        <div className="p-4 rounded-xl border-2 border-[var(--c-danger-line)] bg-[var(--c-danger-soft)]/50 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[var(--c-danger)]">{tr("🗑️ ขอลบบัญชี")}</p>
            <ul className="text-xs text-[var(--c-danger)]/80 mt-2 space-y-1 pl-4 list-disc">
              <li>{tr("ลบสินค้าทั้งหมดของคุณออกจากแพลตฟอร์ม")}</li>
              <li>{tr("ยกเลิกคำสั่งซื้อที่กำลังดำเนินอยู่")}</li>
              <li>{tr("ลบข้อมูลส่วนตัวทั้งหมด")}</li>
              <li>{tr("ไม่สามารถกู้คืนได้")}</li>
            </ul>
            {userData.escrowBalance > 0 && (
              <p className="text-xs text-[var(--c-warn)] mt-2 flex items-center gap-1">{tr("⚠️ คุณมียอด Escrow ค้าง ฿{0} — ต้องรอให้เสร็จสิ้นก่อนลบบัญชี", [userData.escrowBalance.toFixed(2)])}</p>
            )}
          </div>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition"
          >{tr("ขอลบบัญชีของฉัน")}</button>
        </div>
      </div>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        showToast={showToast}
      />

      {/* Delete account dialog */}
      <DeleteAccountDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        showToast={showToast}
      />
    </div>
  );
}
