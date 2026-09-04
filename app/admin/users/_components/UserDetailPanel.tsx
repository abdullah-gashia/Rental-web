"use client";

import { useState, useTransition, useEffect } from "react";
import type { UserDetail }                     from "../../_lib/types";
import { formatThaiDate }                      from "../../_lib/utils";
import StatusBadge                             from "../../_components/StatusBadge";
import FinancialSummary                        from "./FinancialSummary";
import { REPORT_CATEGORY_LABEL as CATEGORY_LABEL } from "@/lib/report-categories";
import { getUserDetail, adminEditUser, adjustTrustScore,
         deleteUserReview, setReportStatus, sendUserEmail } from "../actions";

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

  // Email composer
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody,    setMailBody]    = useState("");

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

  /** Re-reads the record so the panel reflects what the action just changed. */
  const refresh = async () => {
    const detail = await getUserDetail(userId);
    if (detail) {
      setData(detail);
      setTrust(detail.trustScore);
    }
  };

  const run = (fn: () => Promise<{ success: boolean; message?: string; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      showToast(res.success, res.success ? (res.message ?? "") : (res.error ?? ""));
      if (res.success) await refresh();
    });
  };

  const handleSendEmail = () => {
    run(async () => {
      const res = await sendUserEmail(userId, mailSubject, mailBody);
      if (res.success) { setMailSubject(""); setMailBody(""); }
      return res;
    });
  };

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

            {/* -- Reputation ------------------------------------------- */}
            <div className="bg-white border border-[#e5e3de] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-[#333]">⭐ คะแนนและรีวิว</h4>
                {data.reviewCount > 0 ? (
                  <span className="text-sm">
                    <PanelStars rating={data.avgRating ?? 0} />
                    <span className="ml-1.5 font-bold text-[#111]">{(data.avgRating ?? 0).toFixed(1)}</span>
                    <span className="ml-1 text-xs text-[#9a9590]">({data.reviewCount} รีวิว)</span>
                  </span>
                ) : (
                  <span className="text-xs text-[#9a9590]">ยังไม่มีรีวิว</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#777]">ปรับคะแนนความน่าเชื่อถือ:</span>
                {[-10, -5, 5, 10].map((d) => (
                  <button
                    key={d}
                    disabled={pending}
                    onClick={() => run(() => adjustTrustScore(userId, d))}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition disabled:opacity-50 ${
                      d < 0
                        ? "border-red-200 text-red-700 hover:bg-red-50"
                        : "border-green-200 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
                <span className="text-xs text-[#9a9590]">ปัจจุบัน {data.trustScore}</span>
              </div>

              {data.reviews.length > 0 && (
                <div className="max-h-56 overflow-y-auto divide-y divide-[#f0ede7] border-t border-[#f0ede7] pt-1">
                  {data.reviews.map((r) => (
                    <div key={r.id} className="py-2 flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PanelStars rating={r.rating} />
                          <span className="text-xs font-medium text-[#333]">{r.reviewer.name ?? "ผู้ใช้"}</span>
                          <span className="text-[10px] text-[#b0ada6]">{formatShort(r.createdAt)}</span>
                        </div>
                        {r.itemTitle && <p className="text-[11px] text-[#9a9590] truncate">{r.itemTitle}</p>}
                        {r.comment && <p className="text-xs text-[#555] mt-0.5">{r.comment}</p>}
                      </div>
                      <button
                        disabled={pending}
                        onClick={() => run(() => deleteUserReview(r.id))}
                        title="ลบรีวิวนี้ (คะแนนดาวจะถูกคำนวณใหม่)"
                        className="text-[11px] text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* -- Abuse reports (admin only) ---------------------------- */}
            <div className="bg-white border border-[#e5e3de] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#333]">
                  🚩 รายงานจากผู้ใช้
                  {data.openReportCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                      ใหม่ {data.openReportCount}
                    </span>
                  )}
                </h4>
                <span className="text-[10px] text-[#b0ada6]">ผู้ถูกรายงานไม่เห็นข้อมูลนี้</span>
              </div>

              {data.reports.length === 0 ? (
                <p className="text-xs text-[#9a9590] py-3 text-center">ยังไม่มีรายงาน</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {data.reports.map((rep) => (
                    <div
                      key={rep.id}
                      className={`rounded-xl border p-3 ${
                        rep.status === "OPEN" ? "border-red-200 bg-red-50/40" : "border-[#e5e3de] bg-[#faf9f7]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#333]">
                          {CATEGORY_LABEL[rep.category ?? ""] ?? rep.category ?? "อื่นๆ"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rep.status === "OPEN"       ? "bg-red-100 text-red-700"
                          : rep.status === "REVIEWED" ? "bg-green-100 text-green-700"
                          :                             "bg-gray-200 text-gray-600"
                        }`}>
                          {rep.status === "OPEN" ? "รอตรวจสอบ" : rep.status === "REVIEWED" ? "ตรวจแล้ว" : "ยกเลิก"}
                        </span>
                      </div>
                      <p className="text-xs text-[#555] mt-1.5 whitespace-pre-wrap">{rep.reason}</p>
                      <p className="text-[10px] text-[#9a9590] mt-1.5">
                        โดย {rep.reporter.name ?? rep.reporter.email} · {formatShort(rep.createdAt)}
                      </p>
                      {rep.status === "OPEN" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            disabled={pending}
                            onClick={() => run(() => setReportStatus(rep.id, "REVIEWED"))}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                          >
                            ตรวจสอบแล้ว
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => run(() => setReportStatus(rep.id, "DISMISSED"))}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#e5e3de] text-[#555] hover:bg-[#f0ede7] transition disabled:opacity-50"
                          >
                            ไม่มีมูล
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* -- Send the user an e-mail ------------------------------- */}
            <div className="bg-white border border-[#e5e3de] rounded-2xl p-4 space-y-2.5">
              <h4 className="text-sm font-bold text-[#333]">✉️ ส่งอีเมลถึงผู้ใช้</h4>
              <p className="text-[11px] text-[#9a9590]">ส่งไปที่ {data.email}</p>
              <input
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value.slice(0, 150))}
                placeholder="หัวข้อ"
                className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
              />
              <textarea
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value.slice(0, 3000))}
                rows={4}
                placeholder="ข้อความถึงผู้ใช้..."
                className="w-full px-3 py-2 rounded-lg border border-[#e5e3de] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSendEmail}
                  disabled={pending || !mailSubject.trim() || !mailBody.trim()}
                  className="px-4 py-2 rounded-xl bg-[#e8500a] text-white text-sm font-bold hover:bg-[#c94208] transition disabled:opacity-40"
                >
                  {pending ? "กำลังส่ง…" : "ส่งอีเมล"}
                </button>
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


function PanelStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex text-[13px] leading-none align-middle">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rounded ? "text-amber-400" : "text-[#e5e3de]"}>★</span>
      ))}
    </span>
  );
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
