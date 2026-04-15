"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "../actions";

// ─── Verification status labels ───────────────────────────────────────────────

const VERIFICATION_LABELS: Record<string, { label: string; cls: string }> = {
  UNVERIFIED: { label: "ยังไม่ยืนยัน",    cls: "text-gray-500"  },
  PENDING:    { label: "รอตรวจสอบ",      cls: "text-yellow-600" },
  APPROVED:   { label: "✅ ยืนยันแล้ว",   cls: "text-green-700"  },
  REJECTED:   { label: "❌ ถูกปฏิเสธ",    cls: "text-red-600"    },
  SUSPENDED:  { label: "⚠️ ถูกระงับ",     cls: "text-orange-600" },
};

const PSU_TYPE_LABELS: Record<string, string> = {
  STUDENT: "นักศึกษา",
  STAFF:   "บุคลากร",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  userData: any;
  showToast: (ok: boolean, msg: string) => void;
}

export default function ProfileTab({ userData, showToast }: ProfileTabProps) {
  const [name, setName]   = useState(userData.name ?? "");
  const [phone, setPhone] = useState(userData.phone ?? "");
  const [bio, setBio]     = useState(userData.bio ?? "");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      });
      showToast(res.success, res.success ? res.message : res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[#111] flex items-center gap-2">
        <span>👤</span> ข้อมูลส่วนตัว
      </h2>

      {/* Avatar section */}
      <div className="flex items-center gap-4 p-4 bg-[#faf9f7] rounded-xl border border-[#e5e3de]">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#e8500a] to-[#ff7a3d] flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md flex-shrink-0">
          {userData.image ? (
            <img src={userData.image} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            (userData.name || "U")[0].toUpperCase()
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-[#333]">{userData.name ?? "User"}</p>
          <p className="text-xs text-[#9a9590]">{userData.email}</p>
          <p className="text-[10px] text-[#b0ada6] mt-1">
            รองรับ JPG, PNG ขนาดไม่เกิน 2MB
          </p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">
            ชื่อที่แสดง <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e3de] bg-white text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            placeholder="ชื่อที่จะแสดงให้ผู้อื่นเห็น"
          />
          <p className="text-[11px] text-[#9a9590] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ชื่อนี้จะแสดงในสินค้าและประวัติการซื้อขายของคุณ
          </p>
        </div>

        {/* Email — read only */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">
            อีเมล <span className="text-[#b0ada6]">🔒</span>
          </label>
          <input
            type="email"
            value={userData.email}
            disabled
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e3de] bg-[#faf9f7] text-sm text-[#999] cursor-not-allowed"
          />
          <p className="text-[11px] text-[#9a9590] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            อีเมลเชื่อมกับบัญชี PSU ของคุณ — ไม่สามารถเปลี่ยนได้
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">
            เบอร์โทรศัพท์
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            maxLength={10}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e3de] bg-white text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            placeholder="0812345678"
          />
          <p className="text-[11px] text-[#9a9590] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ใช้สำหรับติดต่อเรื่องการซื้อขาย
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1">
            แนะนำตัว <span className="text-[#b0ada6] text-xs">(ไม่บังคับ)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e3de] bg-white text-sm text-[#111] resize-none focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            placeholder="เล่าเกี่ยวกับตัวคุณ..."
          />
          <p className="text-[11px] text-[#9a9590] text-right">
            {bio.length}/200 ตัวอักษร
          </p>
        </div>
      </div>

      {/* KYC / Verification info — read only */}
      <div className="border-t border-[#e5e3de] pt-5">
        <h3 className="text-sm font-semibold text-[#555] mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          ข้อมูลยืนยันตัวตน
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#faf9f7] rounded-xl border border-[#e5e3de]">
          <div>
            <span className="text-[11px] text-[#9a9590] uppercase tracking-wider">สถานะ</span>
            <p className={`text-sm font-medium mt-0.5 ${
              VERIFICATION_LABELS[userData.verificationStatus]?.cls ?? "text-gray-500"
            }`}>
              {VERIFICATION_LABELS[userData.verificationStatus]?.label ?? userData.verificationStatus}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-[#9a9590] uppercase tracking-wider">ประเภท</span>
            <p className="text-sm font-medium text-[#333] mt-0.5">
              {userData.psuIdType ? PSU_TYPE_LABELS[userData.psuIdType] ?? userData.psuIdType : "—"}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-[#9a9590] uppercase tracking-wider">รหัส PSU</span>
            <p className="text-sm font-medium text-[#333] mt-0.5 font-mono">
              {userData.psuIdNumber ?? "—"}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-[#9a9590] uppercase tracking-wider">บทบาท</span>
            <p className="text-sm font-medium text-[#333] mt-0.5">
              {userData.role === "ADMIN" ? "แอดมิน" : "นักศึกษา"}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[#9a9590] mt-2 flex items-start gap-1">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ข้อมูลนี้ไม่สามารถแก้ไขได้ หากต้องการเปลี่ยน กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 bg-[#e8500a] hover:bg-[#c94208] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
        >
          {pending && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>
    </form>
  );
}
