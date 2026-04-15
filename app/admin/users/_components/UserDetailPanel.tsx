"use client";

import { useState, useTransition, useEffect } from "react";
import type { UserDetail }                     from "../../_lib/types";
import { formatThaiDate }                      from "../../_lib/utils";
import StatusBadge                             from "../../_components/StatusBadge";
import FinancialSummary                        from "./FinancialSummary";
import { getUserDetail, adminEditUser }        from "../actions";

interface Props {
  userId:    string;
  onClose:   () => void;
  showToast: (ok: boolean, msg: string) => void;
}

const VERIFICATION_LABELS: Record<string, string> = {
  UNVERIFIED: "ยังไม่ยืนยัน", PENDING: "รอตรวจสอบ",
  APPROVED: "ผ่านแล้ว", REJECTED: "ถูกปฏิเสธ", SUSPENDED: "ถูกระงับ",
};

export default function UserDetailPanel({ userId, onClose, showToast }: Props) {
  const [data, setData]    = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  // Form state
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [role,   setRole]   = useState<"ADMIN" | "STUDENT">("STUDENT");
  const [banned, setBanned] = useState(false);
  const [trust,  setTrust]  = useState(100);
  const [kyc,    setKyc]    = useState("UNVERIFIED");
  const [note,   setNote]   = useState("");

  // Load data
  useEffect(() => {
    (async () => {
      setLoading(true);
      const detail = await getUserDetail(userId);
      if (detail) {
        setData(detail);
        setName(detail.name ?? "");
        setPhone(detail.phone ?? "");
        setRole(detail.role);
        setBanned(detail.isBanned);
        setTrust(detail.trustScore);
        setKyc(detail.verificationStatus);
      }
      setLoading(false);
    })();
  }, [userId]);

  const handleSave = () => {
    startTransition(async () => {
      const res = await adminEditUser({
        userId,
        name: name.trim(),
        phone: phone.trim() || null,
        role,
        isBanned: banned,
        trustScore: trust,
        verificationStatus: kyc as any,
        adminNote: note.trim() || undefined,
      });
      showToast(res.success, res.success ? res.message : res.error);
      if (res.success) {
        // Refresh data
        const detail = await getUserDetail(userId);
        if (detail) setData(detail);
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[600px] bg-white shadow-2xl z-[401] overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e5e3de] px-5 py-3.5 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#333] transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            ปิด
          </button>
          <h2 className="text-sm font-bold text-[#111]">รายละเอียดผู้ใช้</h2>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#555] border border-[#e5e3de] rounded-lg hover:bg-[#f7f6f3] transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={pending || loading}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#e8500a] rounded-lg hover:bg-[#c94208] transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {pending && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              บันทึก
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#f0ede7] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data ? (
          <div className="p-10 text-center text-[#aaa]">ไม่พบข้อมูลผู้ใช้</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* ── Profile header ────────────────────────────────────────── */}
            <div className="flex items-center gap-4 p-4 bg-[#faf9f7] rounded-xl border border-[#e5e3de]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d] flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                {data.image ? (
                  <img src={data.image} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  (data.name || data.email)[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#111] truncate">{data.name ?? "—"}</p>
                <p className="text-xs text-[#9a9590] truncate">{data.email}</p>
                <p className="text-[11px] text-[#b0ada6] mt-0.5">สมัครเมื่อ: {formatThaiDate(data.createdAt)}</p>
              </div>
            </div>

            {/* ── Status badges row ────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="สถานะ" val={data.isBanned ? "ถูกแบน" : "ปกติ"} color={data.isBanned ? "red" : "green"} />
              <StatCard label="ยืนยัน" val={VERIFICATION_LABELS[data.verificationStatus] ?? data.verificationStatus} color={data.verificationStatus === "APPROVED" ? "green" : "yellow"} />
              <StatCard label="Trust" val={String(data.trustScore)} color={data.trustScore >= 80 ? "green" : data.trustScore >= 50 ? "yellow" : "red"} />
              <StatCard label="บทบาท" val={data.role === "ADMIN" ? "แอดมิน" : "นักศึกษา"} color={data.role === "ADMIN" ? "purple" : "gray"} />
            </div>

            {/* ── Financial summary ────────────────────────────────────── */}
            <FinancialSummary data={data} />

            {/* ── Activity summary ─────────────────────────────────────── */}
            <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#e5e3de]">
              <h3 className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                📊 สรุปกิจกรรม
              </h3>
              <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-sm">
                <div><span className="text-[#9a9590]">สินค้าทั้งหมด:</span> <span className="font-medium">{data.itemCount}</span></div>
                <div><span className="text-[#9a9590]">ขายแล้ว:</span> <span className="font-medium">{data.soldItemCount}</span></div>
                <div><span className="text-[#9a9590]">กำลังขาย:</span> <span className="font-medium">{data.activeItemCount}</span></div>
                <div><span className="text-[#9a9590]">ออเดอร์ (ซื้อ):</span> <span className="font-medium">{data.buyOrderCount}</span></div>
                <div><span className="text-[#9a9590]">ออเดอร์ (ขาย):</span> <span className="font-medium">{data.sellOrderCount}</span></div>
                <div><span className="text-[#9a9590]">ข้อพิพาท:</span> <span className="font-medium">{data.disputeCount}</span></div>
                <div><span className="text-[#9a9590]">ถูกยกเลิก:</span> <span className="font-medium">{data.cancelledCount}</span></div>
              </div>
            </div>

            {/* ── Editable fields ──────────────────────────────────────── */}
            <div className="p-4 bg-white rounded-xl border border-[#e5e3de] space-y-3">
              <h3 className="text-xs font-semibold text-[#555] uppercase tracking-wider flex items-center gap-1.5">
                ✏️ แก้ไขข้อมูล
              </h3>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">ชื่อที่แสดง *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">เบอร์โทร</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                  placeholder="0812345678"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">บทบาท *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "STUDENT")}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                >
                  <option value="STUDENT">นักศึกษา (STUDENT)</option>
                  <option value="ADMIN">แอดมิน (ADMIN)</option>
                </select>
              </div>

              {/* Ban status */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">สถานะบัญชี *</label>
                <select
                  value={banned ? "BANNED" : "ACTIVE"}
                  onChange={(e) => setBanned(e.target.value === "BANNED")}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                >
                  <option value="ACTIVE">ปกติ (ACTIVE)</option>
                  <option value="BANNED">ถูกแบน (BANNED)</option>
                </select>
              </div>

              {/* Trust score */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">Trust Score * (0–200)</label>
                <input
                  type="number"
                  value={trust}
                  onChange={(e) => setTrust(Math.min(200, Math.max(0, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={200}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                />
              </div>

              {/* KYC status */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">สถานะ KYC *</label>
                <select
                  value={kyc}
                  onChange={(e) => setKyc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                >
                  <option value="UNVERIFIED">ยังไม่ยืนยัน (UNVERIFIED)</option>
                  <option value="PENDING">รอตรวจสอบ (PENDING)</option>
                  <option value="APPROVED">ผ่านแล้ว (APPROVED)</option>
                  <option value="REJECTED">ถูกปฏิเสธ (REJECTED)</option>
                  <option value="SUSPENDED">ถูกระงับ (SUSPENDED)</option>
                </select>
              </div>

              {/* Admin note */}
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1">
                  บันทึก Admin <span className="text-[#b0ada6]">(ไม่แสดงให้ user เห็น)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
                  placeholder="บันทึกสำหรับผู้ดูแลระบบ..."
                />
              </div>
            </div>

            {/* ── Quick links ──────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
              <QuickLink href={`/admin/items?seller=${userId}`} label="ดูสินค้าของผู้ใช้" />
              <QuickLink href={`/admin/orders?user=${userId}`} label="ดูออเดอร์" />
              <QuickLink href={`/admin/disputes?user=${userId}`} label="ดูข้อพิพาท" />
              <QuickLink href={`/admin/verifications?user=${userId}`} label="ดู KYC" />
            </div>

            {/* ── Bottom action bar ────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#e5e3de]">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-[#555] border border-[#e5e3de] rounded-xl hover:bg-[#f7f6f3] transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={pending}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#e8500a] rounded-xl hover:bg-[#c94208] transition disabled:opacity-50 flex items-center gap-2"
              >
                {pending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function StatCard({ label, val, color }: { label: string; val: string; color: string }) {
  const colorMap: Record<string, string> = {
    green:  "bg-green-50 text-green-700 border-green-200",
    red:    "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    gray:   "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <div className={`p-2.5 rounded-lg border text-center ${colorMap[color] ?? colorMap.gray}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xs font-bold mt-0.5">{val}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 text-xs font-medium text-[#555] border border-[#e5e3de] rounded-lg hover:bg-[#f7f6f3] hover:text-[#e8500a] transition"
    >
      🔗 {label}
    </a>
  );
}
