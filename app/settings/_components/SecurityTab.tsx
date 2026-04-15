"use client";

import { useState, useTransition } from "react";
import { updateTrackingPreference, clearViewHistory, exportMyData } from "../actions";
import DeleteAccountDialog from "./DeleteAccountDialog";

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
  const [tracking, setTracking] = useState(userData.trackingEnabled);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleToggleTracking = () => {
    const newVal = !tracking;
    setTracking(newVal);
    startTransition(async () => {
      const res = await updateTrackingPreference(newVal);
      showToast(res.success, res.success ? res.message : res.error);
      if (!res.success) setTracking(!newVal); // revert on failure
    });
  };

  const handleClearHistory = () => {
    startTransition(async () => {
      const res = await clearViewHistory();
      showToast(res.success, res.success ? res.message : res.error);
    });
  };

  const handleExport = () => {
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
        showToast(true, "ดาวน์โหลดข้อมูลเรียบร้อยแล้ว");
      } else {
        showToast(false, res.error);
      }
    });
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[#111] flex items-center gap-2">
        <span>🔒</span> บัญชีและความปลอดภัย
      </h2>

      {/* Login info */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[#555]">การเข้าสู่ระบบ</h3>
        <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#e5e3de] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#555]">วิธีเข้าสู่ระบบ</span>
            <span className="text-sm font-medium text-[#333]">PSU Account (Credentials)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#555]">สมัครเมื่อ</span>
            <span className="text-sm font-medium text-[#333]">{formatThaiDate(userData.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Browsing history */}
      <div className="border-t border-[#e5e3de] pt-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#555]">ประวัติการเข้าชม</h3>
        <p className="text-xs text-[#9a9590]">
          ระบบจดจำสินค้าที่คุณเคยดูเพื่อแนะนำสินค้าที่ตรงใจ
        </p>

        <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-[#faf9f7] border border-[#e5e3de]">
          <div>
            <p className="text-sm font-medium text-[#333]">เปิดการบันทึกประวัติ</p>
            <p className="text-[11px] text-[#9a9590]">ใช้สำหรับแนะนำสินค้าอัตโนมัติ</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={tracking}
            onClick={handleToggleTracking}
            disabled={pending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
              tracking ? "bg-[#e8500a]" : "bg-[#ddd]"
            } disabled:opacity-50`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                tracking ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={pending}
          className="flex items-center gap-2 text-sm text-[#555] hover:text-red-600 transition disabled:opacity-50"
        >
          🗑️ ล้างประวัติการเข้าชมทั้งหมด
          {pending && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        </button>
      </div>

      {/* Data export */}
      <div className="border-t border-[#e5e3de] pt-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#555]">ข้อมูลของฉัน</h3>
        <button
          onClick={handleExport}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5e3de] text-sm font-medium text-[#333] hover:bg-[#f7f6f3] transition disabled:opacity-50"
        >
          📥 ดาวน์โหลดข้อมูลของฉัน
          {pending && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        </button>
        <p className="text-[11px] text-[#9a9590] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ดาวน์โหลดข้อมูลทั้งหมดที่เกี่ยวข้องกับบัญชีของคุณ (JSON)
        </p>
      </div>

      {/* Danger zone */}
      <div className="border-t border-[#e5e3de] pt-5">
        <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1.5">
          ⚠️ โซนอันตราย
        </h3>
        <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/50 space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-700">🗑️ ขอลบบัญชี</p>
            <ul className="text-xs text-red-600/80 mt-2 space-y-1 pl-4 list-disc">
              <li>ลบสินค้าทั้งหมดของคุณออกจากแพลตฟอร์ม</li>
              <li>ยกเลิกคำสั่งซื้อที่กำลังดำเนินอยู่</li>
              <li>ลบข้อมูลส่วนตัวทั้งหมด</li>
              <li>ไม่สามารถกู้คืนได้</li>
            </ul>
            {userData.escrowBalance > 0 && (
              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                ⚠️ คุณมียอด Escrow ค้าง ฿{userData.escrowBalance.toFixed(2)} — ต้องรอให้เสร็จสิ้นก่อนลบบัญชี
              </p>
            )}
          </div>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition"
          >
            ขอลบบัญชีของฉัน
          </button>
        </div>
      </div>

      {/* Delete account dialog */}
      <DeleteAccountDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        showToast={showToast}
      />
    </div>
  );
}
