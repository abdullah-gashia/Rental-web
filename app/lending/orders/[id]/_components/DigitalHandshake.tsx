"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { confirmPickup, confirmReturn } from "@/lib/actions/lending-orders";
import type { ItemCondition } from "@prisma/client";

interface Props {
  orderId: string;
  type: "pickup" | "return";
  role: "BORROWER" | "LENDER";
  myConfirmed: boolean;
  otherConfirmed: boolean;
}

const CONDITION_OPTIONS: { value: ItemCondition; label: string; color: string; damageSuggestion: number }[] = [
  { value: "LIKE_NEW", label: "😊 สภาพเหมือนเดิม — ไม่มีความเสียหาย", color: "border-green-300 bg-green-50", damageSuggestion: 0 },
  { value: "GOOD", label: "😐 มีรอยเล็กน้อย — เสียหายน้อย", color: "border-yellow-300 bg-yellow-50", damageSuggestion: 0 },
  { value: "FAIR", label: "😟 เสียหายพอสมควร", color: "border-orange-300 bg-orange-50", damageSuggestion: 0 },
  { value: "NEEDS_REPAIR", label: "😡 เสียหายมาก / ใช้ไม่ได้", color: "border-red-300 bg-red-50", damageSuggestion: 0 },
];

export default function DigitalHandshake({ orderId, type, role, myConfirmed, otherConfirmed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [returnCondition, setReturnCondition] = useState<ItemCondition>("LIKE_NEW");
  const [damageFee, setDamageFee] = useState("0");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isReturn = type === "return";
  const isLender = role === "LENDER";

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || photos.length >= 4) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        Array.from(files).slice(0, 4 - photos.length).map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          return data.url as string;
        })
      );
      setPhotos((prev) => [...prev, ...results.filter(Boolean)]);
    } catch {
      setError("อัปโหลดรูปล้มเหลว กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    if (photos.length < 1) { setError("กรุณาถ่ายรูปอย่างน้อย 1 รูป"); return; }
    if (!agreed) { setError("กรุณายืนยันว่าคุณตรวจสอบของแล้ว"); return; }
    setError(null);

    startTransition(async () => {
      let res;
      if (isReturn) {
        res = await confirmReturn(
          orderId,
          photos,
          note || undefined,
          isLender ? returnCondition : undefined,
          isLender ? parseFloat(damageFee) || 0 : undefined
        );
      } else {
        res = await confirmPickup(orderId, photos, note || undefined);
      }

      if (res.success) {
        router.refresh();
      } else {
        setError((res as any).error ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  if (myConfirmed) {
    return (
      <div className={`rounded-2xl border p-5 ${otherConfirmed ? "bg-green-50 border-green-200" : "bg-[#faf9f7] border-[#e5e3de]"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{otherConfirmed ? "✅" : "⏳"}</span>
          <div>
            <p className="text-sm font-semibold text-[#111]">
              {otherConfirmed ? "ทั้งสองฝ่ายยืนยันแล้ว!" : "รอการยืนยันจากอีกฝ่าย..."}
            </p>
            <p className="text-xs text-[#777]">คุณยืนยันแล้ว</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e3de] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤝</span>
        <div>
          <h3 className="text-sm font-bold text-[#111]">
            Digital Handshake — {isReturn ? "คืนของ" : "รับของ"}
          </h3>
          <p className="text-xs text-[#777]">
            {otherConfirmed ? "✅ อีกฝ่ายยืนยันแล้ว — รอคุณยืนยัน" : "รอการยืนยันทั้งสองฝ่าย"}
          </p>
        </div>
      </div>

      {/* Step 1: Photos */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-2">
          ขั้นตอนที่ 1: ถ่ายรูปสภาพของ (อย่างน้อย 1 รูป) *
        </p>
        <div className="flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#e5e3de]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-[9px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-[#e5e3de] flex flex-col
                         items-center justify-center text-[#aaa] hover:border-[#e8500a] hover:text-[#e8500a]
                         transition text-[10px]"
            >
              {uploading ? "..." : <><span className="text-xl mb-0.5">📷</span>+</>}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handlePhotoUpload(e.target.files)} />
      </div>

      {/* Step 2: Note */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-2">ขั้นตอนที่ 2: หมายเหตุสภาพของ</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="เช่น มีรอยขีดข่วนเล็กน้อยที่ฝา, อุปกรณ์ครบ"
          className="w-full px-3 py-2 text-sm border border-[#e5e3de] rounded-xl resize-none
                     focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
        />
      </div>

      {/* Step 3 (Return + Lender only): Rate condition */}
      {isReturn && isLender && (
        <div>
          <p className="text-xs font-semibold text-[#555] mb-2">
            ขั้นตอนที่ 3: ประเมินสภาพของที่รับคืน *
          </p>
          <div className="space-y-2">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setReturnCondition(opt.value);
                  if (opt.value === "LIKE_NEW" || opt.value === "GOOD") setDamageFee("0");
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition text-xs ${
                  returnCondition === opt.value
                    ? opt.color + " font-semibold"
                    : "border-[#e5e3de] hover:border-[#aaa]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(returnCondition === "FAIR" || returnCondition === "NEEDS_REPAIR") && (
            <div className="mt-3">
              <label className="text-xs font-semibold text-[#555] block mb-1.5">
                ค่าเสียหาย (฿) — หักจากมัดจำ
              </label>
              <input
                type="number"
                value={damageFee}
                onChange={(e) => setDamageFee(e.target.value)}
                min="0"
                className="w-32 px-3 py-2 text-sm border border-[#e5e3de] rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30"
              />
              <p className="text-[11px] text-orange-600 mt-1">
                ⚠️ ผู้ยืมสามารถเปิดข้อพิพาทหากไม่เห็นด้วย
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step: Agree */}
      <button
        type="button"
        onClick={() => setAgreed((v) => !v)}
        className="flex items-center gap-2.5 text-sm text-[#555]"
      >
        <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition ${
          agreed ? "bg-[#e8500a] border-[#e8500a] text-white" : "border-[#ccc]"
        }`}>
          {agreed && "✓"}
        </span>
        ฉันตรวจสอบสภาพของแล้วและยืนยันว่าถูกต้อง *
      </button>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      <button
        onClick={handleConfirm}
        disabled={pending || uploading}
        className="w-full py-3 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                   hover:bg-[#c94208] transition disabled:opacity-50"
      >
        {pending ? "กำลังยืนยัน..." : isReturn ? "✅ ยืนยันคืนของ" : "✅ ยืนยันรับ/ส่งของ"}
      </button>
    </div>
  );
}
