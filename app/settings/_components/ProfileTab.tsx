"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateAvatar } from "../actions";
import ChangePasswordDialog from "./ChangePasswordDialog";
import AvatarEditor from "@/components/forms/AvatarEditor";

// ─── Verification status labels ───────────────────────────────────────────────

const VERIFICATION_LABELS: Record<string, { label: string; cls: string }> = {
  UNVERIFIED: { label: "ยังไม่ยืนยัน",    cls: "text-[var(--c-muted)]"  },
  PENDING:    { label: "รอตรวจสอบ",      cls: "text-[var(--c-warn)]" },
  APPROVED:   { label: "✅ ยืนยันแล้ว",   cls: "text-[var(--c-ok)]"  },
  REJECTED:   { label: "❌ ถูกปฏิเสธ",    cls: "text-[var(--c-danger)]"    },
  SUSPENDED:  { label: "⚠️ ถูกระงับ",     cls: "text-[var(--c-warn)]" },
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
  const tr = useLocaleStore((s) => s.tr);
  const [name, setName]   = useState(userData.name ?? "");
  const [phone, setPhone] = useState(userData.phone ?? "");
  const [bio, setBio]     = useState(userData.bio ?? "");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatar, setAvatar]         = useState<string | null>(userData.image ?? null);
  const [pending, startTransition]  = useTransition();
  const router = useRouter();

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
    <>
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
      <h2 className="text-lg font-bold text-[var(--c-ink)] flex items-center gap-2">
        <span>👤</span> ข้อมูลส่วนตัว
      </h2>

      {/* Avatar section */}
      <div className="flex items-center gap-4 p-4 bg-[var(--c-subtle)] rounded-xl border border-[var(--c-line)]">
        <button
          type="button"
          onClick={() => setAvatarOpen(true)}
          className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-lite)] flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0 overflow-hidden"
          aria-label={tr("เปลี่ยนรูปโปรไฟล์")}
        >
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (userData.name || "U")[0].toUpperCase()
          )}
          <span className="absolute inset-0 bg-[rgba(10,25,47,.55)] text-white text-[10.5px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">{tr("เปลี่ยนรูป")}</span>
        </button>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--c-ink-1)] truncate">{userData.name ?? "User"}</p>
          <p className="text-xs text-[var(--c-muted)] truncate">{userData.email}</p>
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            className="ui-btn ui-btn-ghost ui-btn-sm mt-2"
          >
            {avatar ? tr("เปลี่ยนรูปโปรไฟล์") : tr("เพิ่มรูปโปรไฟล์")}
          </button>
          <p className="text-[10.5px] text-[var(--c-faint)] mt-1.5">{tr("ไฟล์รูปทุกชนิด ทุกขนาด — เลือกมุมที่จะแสดงได้เอง")}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1">{tr("ชื่อที่แสดง")}<span className="text-[var(--c-danger)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)] text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
            placeholder={tr("ชื่อที่จะแสดงให้ผู้อื่นเห็น")}
          />
          <p className="text-[11px] text-[var(--c-muted)] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{tr("ชื่อนี้จะแสดงในสินค้าและประวัติการซื้อขายของคุณ")}</p>
        </div>

        {/* Email — read only */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1">{tr("อีเมล")}<span className="text-[var(--c-faint)]">🔒</span>
          </label>
          <input
            type="email"
            value={userData.email}
            disabled
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-subtle)] text-sm text-[var(--c-faint)] cursor-not-allowed"
          />
          <p className="text-[11px] text-[var(--c-muted)] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{tr("อีเมลเชื่อมกับบัญชี PSU ของคุณ — ไม่สามารถเปลี่ยนได้")}</p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1">{tr("รหัสผ่าน")}</label>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-subtle)]">
            <span className="text-sm text-[var(--c-faint)] tracking-[0.2em] select-none">••••••••</span>
            <button
              type="button"
              onClick={() => setShowPasswordDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-surface)] text-xs font-semibold text-[var(--c-ink-1)] hover:bg-[var(--c-canvas)] transition flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 11.001-.001M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
              </svg>{tr("เปลี่ยนรหัสผ่าน")}</button>
          </div>
          <p className="text-[11px] text-[var(--c-muted)] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{tr("ต้องยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสใหม่")}</p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1">{tr("เบอร์โทรศัพท์")}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            maxLength={10}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)] text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
            placeholder="0812345678"
          />
          <p className="text-[11px] text-[var(--c-muted)] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>{tr("ใช้สำหรับติดต่อเรื่องการซื้อขาย")}</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1">{tr("แนะนำตัว")}<span className="text-[var(--c-faint)] text-xs">{tr("(ไม่บังคับ)")}</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-surface)] text-sm text-[var(--c-ink)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
            placeholder={tr("เล่าเกี่ยวกับตัวคุณ...")}
          />
          <p className="text-[11px] text-[var(--c-muted)] text-right">
            {bio.length}/200 ตัวอักษร
          </p>
        </div>
      </div>

      {/* KYC / Verification info — read only */}
      <div className="border-t border-[var(--c-line)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--c-ink-2)] mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>{tr("ข้อมูลยืนยันตัวตน")}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[var(--c-subtle)] rounded-xl border border-[var(--c-line)]">
          <div>
            <span className="text-[11px] text-[var(--c-muted)] uppercase tracking-wider">{tr("สถานะ")}</span>
            <p className={`text-sm font-medium mt-0.5 ${
              VERIFICATION_LABELS[userData.verificationStatus]?.cls ?? "text-[var(--c-muted)]"
            }`}>
              {tr(VERIFICATION_LABELS[userData.verificationStatus]?.label ?? userData.verificationStatus)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-[var(--c-muted)] uppercase tracking-wider">{tr("ประเภท")}</span>
            <p className="text-sm font-medium text-[var(--c-ink-1)] mt-0.5">
              {userData.psuIdType ? tr(PSU_TYPE_LABELS[userData.psuIdType] ?? userData.psuIdType) : "—"}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-[var(--c-muted)] uppercase tracking-wider">{tr("รหัส PSU")}</span>
            <p className="text-sm font-medium text-[var(--c-ink-1)] mt-0.5 font-mono">
              {userData.psuIdNumber ?? "—"}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-[var(--c-muted)] uppercase tracking-wider">{tr("บทบาท")}</span>
            <p className="text-sm font-medium text-[var(--c-ink-1)] mt-0.5">
              {userData.role === "ADMIN" ? "แอดมิน" : "นักศึกษา"}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[var(--c-muted)] mt-2 flex items-start gap-1">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>{tr("ข้อมูลนี้ไม่สามารถแก้ไขได้ หากต้องการเปลี่ยน กรุณาติดต่อผู้ดูแลระบบ")}</p>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-str)] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
        >
          {pending && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>

    </form>

    {/* Outside the form on purpose — the dialog has its own <form>, and
        nesting forms makes its submit button post the profile form. */}
      {avatarOpen && (
        <AvatarEditor
          current={avatar}
          onCancel={() => setAvatarOpen(false)}
          onSaved={(url) => {
            setAvatarOpen(false);
            startTransition(async () => {
              const res = await updateAvatar(url);
              if (res.success) setAvatar(url);
              showToast(res.success, res.success ? res.message : res.error);
              router.refresh();
            });
          }}
        />
      )}

    <ChangePasswordDialog
      open={showPasswordDialog}
      onClose={() => setShowPasswordDialog(false)}
      showToast={showToast}
    />
    </>
  );
}
