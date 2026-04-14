"use client";

import { useState, useRef, useTransition } from "react";
import { confirmShipment } from "@/lib/actions/escrow-actions";

interface Props {
  orderId:   string;
  itemTitle: string;
  onClose:   () => void;
  onSuccess: () => void;
}

const METHODS = [
  { value: "POST",   label: "ไปรษณีย์ไทย",     icon: "✉️" },
  { value: "KERRY",  label: "Kerry Express",    icon: "🟡" },
  { value: "FLASH",  label: "Flash Express",    icon: "⚡" },
  { value: "J&T",    label: "J&T Express",      icon: "🔴" },
  { value: "MEETUP", label: "นัดรับด้วยตนเอง",  icon: "🤝" },
  { value: "OTHER",  label: "อื่นๆ",            icon: "📬" },
] as const;

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res  = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url as string;
}

export default function ShippingModal({ orderId, itemTitle, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [method,          setMethod]          = useState("POST");
  const [trackingNumber,  setTrackingNumber]  = useState("");
  const [proofPreview,    setProofPreview]    = useState<string | null>(null);
  const [proofUrl,        setProofUrl]        = useState<string | null>(null);
  const [proofUploading,  setProofUploading]  = useState(false);
  const [proofError,      setProofError]      = useState<string | null>(null);
  const [formError,       setFormError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isMeetup = method === "MEETUP";

  // ─── Proof image upload ───────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Revoke old preview
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(URL.createObjectURL(file));
    setProofUrl(null);
    setProofUploading(true);
    setProofError(null);

    try {
      const url = await uploadFile(file);
      setProofUrl(url);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setProofUploading(false);
    }
  }

  function clearProof() {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
    setProofUrl(null);
    setProofError(null);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!isMeetup && !trackingNumber.trim()) {
      setFormError("กรุณาระบุหมายเลขพัสดุ (หรือเลือก 'นัดรับด้วยตนเอง')");
      return;
    }
    if (proofUploading) {
      setFormError("กรุณารอให้อัปโหลดรูปเสร็จสิ้น");
      return;
    }

    startTransition(async () => {
      const res = await confirmShipment(orderId, {
        shippingMethod:     method,
        trackingNumber:     trackingNumber.trim() || undefined,
        shippingProofImage: proofUrl ?? undefined,
      });
      if (res.error) {
        setFormError(res.error);
      } else {
        onSuccess();
      }
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e5e3de] px-6 py-4 flex items-start justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-[#111]">ยืนยันการจัดส่ง</h3>
            <p className="text-xs text-[#9a9590] mt-0.5 truncate max-w-xs">{itemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9590] hover:bg-[#f0ede7] hover:text-[#111] transition flex-shrink-0 ml-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Delivery method */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-2">
              วิธีจัดส่ง <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition ${
                    method === m.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-[#e5e3de] bg-white text-[#555] hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="leading-tight text-center">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tracking number — hidden for meetup */}
          {!isMeetup && (
            <div>
              <label className="block text-sm font-semibold text-[#333] mb-1.5">
                หมายเลขพัสดุ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => { setTrackingNumber(e.target.value); setFormError(null); }}
                placeholder="เช่น TH123456789TH"
                disabled={isPending}
                className="w-full border border-[#e5e3de] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition disabled:opacity-60"
              />
            </div>
          )}

          {/* Proof image upload */}
          <div>
            <label className="block text-sm font-semibold text-[#333] mb-0.5">
              รูปหลักฐานการจัดส่ง
              <span className="ml-1 text-xs font-normal text-[#9a9590]">(ไม่บังคับ แต่แนะนำ)</span>
            </label>
            <p className="text-xs text-[#9a9590] mb-3">รูปใบเสร็จ / พัสดุก่อนส่ง JPG / PNG ≤ 5 MB</p>

            {proofPreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-[#e5e3de] bg-[#f0ede7]">
                <img src={proofPreview} alt="" className="w-full h-full object-cover" />

                {proofUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {proofError && (
                  <div className="absolute inset-0 bg-red-600/80 flex items-center justify-center px-4">
                    <p className="text-white text-sm text-center font-medium">{proofError}</p>
                  </div>
                )}
                {!proofUploading && (
                  <button
                    type="button"
                    onClick={clearProof}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isPending}
                className="w-full h-24 rounded-xl border-2 border-dashed border-[#d1cfc9] hover:border-blue-400 hover:bg-blue-50/40 transition flex flex-col items-center justify-center gap-1.5 text-[#9a9590] hover:text-blue-500 disabled:opacity-40"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">อัปโหลดรูปหลักฐาน</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Meetup note */}
          {isMeetup && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">นัดรับ:</span> ผู้ซื้อจะได้รับแจ้งเตือนให้ยืนยันเมื่อรับสินค้าจากคุณโดยตรง
            </div>
          )}

          {/* Error */}
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{formError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending || proofUploading}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {(isPending || proofUploading) && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isPending ? "กำลังบันทึก…" : proofUploading ? "กำลังอัปโหลด…" : "📦 ยืนยันจัดส่งแล้ว"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
