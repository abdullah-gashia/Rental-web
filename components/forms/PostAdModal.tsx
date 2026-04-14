"use client";

import { useState, useRef, useCallback } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import { useToastStore } from "@/lib/stores/toast-store";
import Modal from "@/components/ui/Modal";
import { createItem } from "@/lib/actions/item-actions";

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingImage {
  localId:     string;
  previewUrl:  string;
  uploading:   boolean;
  uploadedUrl: string | null;
  uploadError: string | null;
}

const MAX_IMAGES = 5;
const MAX_BYTES  = 5 * 1024 * 1024;

async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res  = await fetch("/api/upload", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "อัปโหลดไม่สำเร็จ");
  return json.url as string;
}

function Thumb({
  src, isMain, uploading, error, onRemove,
}: {
  src: string; isMain?: boolean; uploading?: boolean;
  error?: string | null; onRemove: () => void;
}) {
  return (
    <div className="relative group w-[80px] h-[80px] rounded-xl overflow-hidden border border-[#e5e3de] bg-[#f0ede7] flex-shrink-0 shadow-[var(--shadow-xs)]">
      <img src={src} alt="" className="w-full h-full object-cover" />

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
          <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[9px] text-white font-semibold">อัปโหลด</span>
        </div>
      )}

      {error && !uploading && (
        <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-1 p-1">
          <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] text-red-200 text-center leading-tight">ล้มเหลว</span>
        </div>
      )}

      {isMain && !uploading && !error && (
        <span className="absolute bottom-1 left-1 bg-[#e8500a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
          หลัก
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Spinner helper
function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PostAdModal({ isOpen, onClose }: PostAdModalProps) {
  const t         = useLocaleStore((s) => s.t);
  const showToast = useToastStore((s) => s.show);

  const [step,          setStep]          = useState(1);
  const [adType,        setAdType]        = useState<"sell" | "rent">("sell");
  const [category,      setCategory]      = useState("");
  const [name,          setName]          = useState("");
  const [desc,          setDesc]          = useState("");
  const [condition,     setCondition]     = useState("LIKE_NEW");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [price,         setPrice]         = useState("");
  const [location,      setLocation]      = useState("");
  const [negotiable,    setNegotiable]    = useState(false);
  const [shippable,     setShippable]     = useState(false);
  const [allowShipping, setAllowShipping] = useState(true);
  const [allowMeetup,   setAllowMeetup]   = useState(true);
  const [allowCOD,      setAllowCOD]      = useState(true);
  const [contact,       setContact]       = useState("");
  const [loading,       setLoading]       = useState(false);
  const [showVerifyGate, setShowVerifyGate] = useState(false);

  const conditions = [
    { key: "LIKE_NEW",     label: t("post_cond_like_new") },
    { key: "GOOD",         label: t("post_cond_good") },
    { key: "FAIR",         label: t("post_cond_fair") },
    { key: "NEEDS_REPAIR", label: t("post_cond_needs_repair") },
  ];

  const resetForm = () => {
    setStep(1); setAdType("sell"); setCategory("");
    setName(""); setDesc(""); setCondition("LIKE_NEW");
    setPrice(""); setLocation("");
    setNegotiable(false); setShippable(false);
    setAllowShipping(true); setAllowMeetup(true); setAllowCOD(true);
    setContact("");
    setLoading(false);
    setPendingImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const totalImages = pendingImages.length;
  const canAddMore  = totalImages < MAX_IMAGES;

  const removePendingImage = (localId: string) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (!selected.length) return;

      const available = MAX_IMAGES - totalImages;
      if (available <= 0) { showToast(`⚠️ สูงสุด ${MAX_IMAGES} รูปภาพต่อสินค้า`); return; }

      const oversized = selected.filter((f) => f.size > MAX_BYTES);
      if (oversized.length > 0) { showToast(`⚠️ ${oversized.map((f) => f.name).join(", ")} ขนาดเกิน 5 MB`); return; }

      const files = selected.slice(0, available);
      if (selected.length > available) showToast(`⚠️ เพิ่มได้อีก ${available} รูป (รับ ${files.length} รูปแรก)`);

      const entries: PendingImage[] = files.map((file) => ({
        localId:     `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        previewUrl:  URL.createObjectURL(file),
        uploading:   true,
        uploadedUrl: null,
        uploadError: null,
      }));

      setPendingImages((prev) => [...prev, ...entries]);

      files.forEach((file, i) => {
        const { localId } = entries[i];
        uploadFile(file)
          .then((url) => setPendingImages((prev) => prev.map((p) => p.localId === localId ? { ...p, uploading: false, uploadedUrl: url } : p)))
          .catch((err: Error) => setPendingImages((prev) => prev.map((p) => p.localId === localId ? { ...p, uploading: false, uploadError: err.message } : p)));
      });
    },
    [totalImages, showToast]
  );

  const handleNextFromStep1 = () => {
    if (!category) { showToast("⚠️ กรุณาเลือกหมวดหมู่ก่อน"); return; }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!name.trim()) { showToast(t("post_error_name")); return; }
    if (pendingImages.some((p) => p.uploading)) { showToast("⚠️ กรุณารอให้รูปภาพอัปโหลดเสร็จก่อน"); return; }
    if (pendingImages.some((p) => p.uploadError)) { showToast("⚠️ มีรูปภาพที่อัปโหลดไม่สำเร็จ กรุณาลบออกแล้วลองใหม่"); return; }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { showToast(t("post_error_name")); setStep(2); return; }
    const parsedPrice = Number(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) { showToast(t("post_error_price")); return; }
    if (!allowShipping && !allowMeetup) { showToast("⚠️ กรุณาเลือกวิธีจัดส่งอย่างน้อย 1 วิธี"); return; }

    setLoading(true);
    const imageUrls = pendingImages.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!);

    const result = await createItem({
      title: name.trim(), description: desc.trim() || "-",
      price: parsedPrice, listingType: adType === "sell" ? "SELL" : "RENT",
      condition: condition as "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR",
      categorySlug: category, location: location || undefined,
      negotiable, shippable,
      allowShipping, allowMeetup, allowCOD: allowMeetup ? allowCOD : false,
      contact: contact || undefined, imageUrls,
    });

    setLoading(false);
    if (result.error === "UNVERIFIED") { setShowVerifyGate(true); return; }
    if (result.error) { showToast(`❌ ${result.error}`); return; }
    showToast(t("post_success", { name: name.trim() }));
    resetForm();
    onClose();
  };

  const handleClose = () => { resetForm(); onClose(); };

  const stepLabels = ["ประเภท & หมวดหมู่", "รายละเอียดสินค้า", "ราคา & ที่ตั้ง"];

  // ── Verification gate overlay ─────────────────────────────────────────────
  if (showVerifyGate) {
    return (
      <Modal isOpen={isOpen} onClose={() => { setShowVerifyGate(false); handleClose(); }}>
        <div className="flex flex-col items-center text-center gap-5 py-6 px-2">
          <div className="text-5xl">🔒</div>
          <div>
            <h2 className="text-xl font-bold text-[#111]">ต้องยืนยันตัวตนก่อน</h2>
            <p className="text-sm text-[#9a9590] mt-2 leading-relaxed">
              คุณต้องยืนยันตัวตน PSU ก่อนจึงจะลงขายสินค้าได้
              <br />กระบวนการใช้เวลาประมาณ 2-3 นาที
            </p>
          </div>
          <div className="bg-[#f7f6f3] rounded-2xl px-5 py-4 text-left text-sm space-y-2 w-full">
            {["อัปโหลดรูปบัตรประจำตัว PSU", "ถ่ายรูปยืนยันใบหน้า (Face Liveness)", "รอแอดมินอนุมัติภายใน 24 ชั่วโมง"].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[#e8500a] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-[#333]">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setShowVerifyGate(false); handleClose(); }}
              className="flex-1 py-2.5 border border-[#e5e3de] rounded-xl text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
            >
              ยกเลิก
            </button>
            <a
              href="/profile/verify"
              className="flex-1 py-2.5 bg-[#e8500a] text-white rounded-xl text-sm font-bold text-center hover:bg-[#c94208] transition"
            >
              ยืนยันตัวตน →
            </a>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-[#111] tracking-tight">{t("post_title")}</h2>
          <p className="text-[12px] text-[#9a9590] mt-0.5 font-medium">
            ขั้นตอน {step}/3 — {stepLabels[step - 1]}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#9a9590] hover:text-[#111] hover:bg-[#f0ede7] transition flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3].map((d) => (
          <div
            key={d}
            className={`h-1.5 rounded-full flex-1 transition-all duration-400 ${
              d < step ? "bg-[#10b981]" : d === step ? "bg-[#111]" : "bg-[#e5e3de]"
            }`}
          />
        ))}
      </div>

      {/* ── Step 1 ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="fade-up">
          <p className="text-[11px] font-bold text-[#777] uppercase tracking-widest mb-3">{t("post_type_label")}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(["sell", "rent"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAdType(type)}
                className={`rounded-2xl p-4 text-center transition-all border-2 ${
                  adType === type
                    ? "border-[#111] bg-white shadow-[var(--shadow-sm)]"
                    : "border-[#e5e3de] bg-[#faf9f7] hover:border-[#aaa]"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 text-xl ${
                  type === "sell" ? "bg-orange-50" : "bg-blue-50"
                }`}>
                  {type === "sell" ? "🏷️" : "🔑"}
                </div>
                <p className="text-sm font-bold text-[#111]">{t(type === "sell" ? "post_type_sell" : "post_type_rent")}</p>
                <p className="text-[11px] text-[#9a9590] mt-0.5 leading-tight">{t(type === "sell" ? "post_type_sell_desc" : "post_type_rent_desc")}</p>
              </button>
            ))}
          </div>

          <p className="text-[11px] font-bold text-[#777] uppercase tracking-widest mb-2">{t("post_category_label")}</p>
          <div className="relative mb-5">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm bg-white appearance-none pr-10 transition focus:border-[#111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)] outline-none cursor-pointer"
            >
              <option value="">{t("post_category_placeholder")}</option>
              <option value="secondhand">{t("cat_secondhand")}</option>
              <option value="electronics">{t("cat_electronics")}</option>
              <option value="vehicles">{t("cat_vehicles")}</option>
              <option value="boardgames">{t("cat_boardgames")}</option>
              <option value="books">{t("cat_books")}</option>
              <option value="rental">{t("cat_rental")}</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9590]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            onClick={handleNextFromStep1}
            className="w-full bg-[#111] text-white font-bold py-3 rounded-2xl hover:bg-[#333] transition shadow-[var(--shadow-sm)] text-sm"
          >
            {t("post_next")} →
          </button>
        </div>
      )}

      {/* ── Step 2 ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="fade-up">
          {/* Image picker */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-[#777] uppercase tracking-widest">{t("post_photos_label")}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalImages >= MAX_IMAGES
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-[#f0ede7] text-[#777]"
              }`}>
                {totalImages}/{MAX_IMAGES}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {pendingImages.map((p, idx) => (
                <Thumb
                  key={p.localId}
                  src={p.previewUrl}
                  isMain={idx === 0}
                  uploading={p.uploading}
                  error={p.uploadError}
                  onRemove={() => removePendingImage(p.localId)}
                />
              ))}
              {canAddMore && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[80px] h-[80px] rounded-xl border-2 border-dashed border-[#d9d5cf] hover:border-[#e8500a] hover:bg-orange-50/50 flex flex-col items-center justify-center gap-1 transition group flex-shrink-0"
                >
                  <svg className="w-5 h-5 text-[#ccc] group-hover:text-[#e8500a] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] text-[#bbb] group-hover:text-[#e8500a] transition font-semibold">เพิ่มรูป</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleFileChange} />
            <p className="text-[11px] text-[#bbb] mt-1.5">JPG, PNG, WebP · สูงสุด 5 MB · รูปแรกเป็นรูปหลัก</p>
          </div>

          <div className="space-y-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold text-[#777] uppercase tracking-widest mb-1.5">{t("post_name_label")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder={t("post_name_placeholder")}
                className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm outline-none transition focus:border-[#111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#777] uppercase tracking-widest mb-1.5">{t("post_desc_label")}</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder={t("post_desc_placeholder")}
                className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm resize-none outline-none transition focus:border-[#111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#777] uppercase tracking-widest mb-2">{t("post_condition_label")}</label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(c.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                    condition === c.key
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-[#e5e3de] hover:border-[#111] text-[#555]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 border border-[#e5e3de] font-semibold py-3 rounded-2xl hover:bg-[#f0ede7] transition text-sm">
              ← {t("post_back")}
            </button>
            <button
              onClick={handleNextFromStep2}
              disabled={pendingImages.some((p) => p.uploading)}
              className="flex-1 bg-[#111] text-white font-bold py-3 rounded-2xl hover:bg-[#333] transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-[var(--shadow-sm)]"
            >
              {pendingImages.some((p) => p.uploading) ? <><Spinner /> กำลังอัปโหลด...</> : <>{t("post_next")} →</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="fade-up">
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-[#777] uppercase tracking-widest mb-1.5">{t("post_price_label")}</label>
              <div className="relative">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number" min="0"
                  placeholder={t("post_price_placeholder")}
                  className="w-full border border-[#e5e3de] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition focus:border-[#111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#9a9590]">฿</span>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#555] bg-[#faf9f7] border border-[#e5e3de] rounded-xl px-4 py-2.5 hover:bg-[#f0ede7] transition">
              <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="rounded w-4 h-4 accent-[#e8500a]" />
              <span className="font-medium">{t("post_negotiable")}</span>
            </label>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-[#777] uppercase tracking-widest mb-1.5">{t("post_location_label")}</label>
              <div className="relative">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm bg-white appearance-none pr-10 outline-none transition focus:border-[#111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)] cursor-pointer"
                >
                  <option value="">{t("post_location_placeholder")}</option>
                  <option>หอพักนักศึกษา</option>
                  <option>อาคาร CoC</option>
                  <option>อาคาร SC</option>
                  <option>โรงอาหาร</option>
                  <option>หน้า 7-11</option>
                  <option>อื่นๆ</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9590]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Delivery & Payment config ─────────────────── */}
          <div className="mb-4 rounded-2xl border border-[#e5e3de] overflow-hidden">
            <div className="bg-[#faf9f7] px-4 py-2.5 border-b border-[#e5e3de]">
              <p className="text-[11px] font-bold text-[#777] uppercase tracking-widest">ตั้งค่าการจัดส่งและชำระเงิน</p>
            </div>

            {/* Delivery */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest mb-2">วิธีจัดส่ง</p>
              <div className="space-y-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAllowShipping((v) => v || !allowMeetup ? !v : false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition text-left ${
                    allowShipping ? "border-[#111] bg-white" : "border-[#e5e3de] bg-[#faf9f7] hover:border-[#aaa]"
                  }`}
                >
                  <span className="text-lg">📦</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111]">จัดส่งทางไปรษณีย์</p>
                    <p className="text-[11px] text-[#9a9590]">ผู้ซื้อรับสินค้าทางไปรษณีย์</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    allowShipping ? "border-[#111] bg-[#111]" : "border-[#ccc]"
                  }`}>
                    {allowShipping && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllowMeetup((v) => v || !allowShipping ? !v : false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition text-left ${
                    allowMeetup ? "border-[#111] bg-white" : "border-[#e5e3de] bg-[#faf9f7] hover:border-[#aaa]"
                  }`}
                >
                  <span className="text-lg">🤝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111]">นัดรับสินค้า</p>
                    <p className="text-[11px] text-[#9a9590]">ผู้ซื้อมารับด้วยตนเอง (ใน PSU)</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    allowMeetup ? "border-[#111] bg-[#111]" : "border-[#ccc]"
                  }`}>
                    {allowMeetup && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              </div>
              {!allowShipping && !allowMeetup && (
                <p className="text-[11px] text-red-500 font-medium mb-2">⚠️ ต้องเลือกอย่างน้อย 1 วิธี</p>
              )}
            </div>

            {/* Payment */}
            <div className="px-4 pt-1 pb-3 border-t border-[#f0ede7]">
              <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-widest mb-2 mt-2">วิธีชำระเงิน</p>
              <div className="space-y-2">
                {/* Escrow — always enabled */}
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 border-[#10b981]/40 bg-[#f0fdf4]">
                  <span className="text-lg">🔒</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111]">โอนผ่าน Escrow</p>
                    <p className="text-[11px] text-[#9a9590]">เงินโอนให้ผู้ขายหลังยืนยันรับสินค้า</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#10b981] bg-[#dcfce7] px-2 py-0.5 rounded-full">บังคับใช้</span>
                </div>

                {/* COD — only meaningful when meetup is on */}
                <button
                  type="button"
                  disabled={!allowMeetup}
                  onClick={() => setAllowCOD((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition text-left ${
                    !allowMeetup
                      ? "border-[#e5e3de] bg-[#f7f7f7] opacity-40 cursor-not-allowed"
                      : allowCOD
                        ? "border-[#111] bg-white"
                        : "border-[#e5e3de] bg-[#faf9f7] hover:border-[#aaa]"
                  }`}
                >
                  <span className="text-lg">💵</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111]">เก็บเงินปลายทาง (COD)</p>
                    <p className="text-[11px] text-[#9a9590]">ชำระเงินสดตอนนัดรับ</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    allowMeetup && allowCOD ? "border-[#111] bg-[#111]" : "border-[#ccc]"
                  }`}>
                    {allowMeetup && allowCOD && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-bold text-[#777] uppercase tracking-widest mb-1.5">{t("post_contact_label")}</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              type="text"
              placeholder={t("post_contact_placeholder")}
              className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm outline-none transition focus:border-[#111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
            />
          </div>

          {/* Preview card */}
          {name && (
            <div className="mb-5 p-4 bg-gradient-to-br from-[#faf9f7] to-[#f0ede7] border border-[#e5e3de] rounded-2xl">
              <p className="text-[10px] font-bold text-[#9a9590] uppercase tracking-widest mb-3">{t("post_preview_label")}</p>
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-[#e5e3de] flex items-center justify-center shadow-[var(--shadow-xs)]">
                  {pendingImages[0]?.previewUrl ? (
                    <img src={pendingImages[0].previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111] truncate">{name}</p>
                  <p className="text-base font-extrabold text-[#e8500a]">{price ? `฿${Number(price).toLocaleString()}` : "—"}</p>
                  {location && <p className="text-xs text-[#9a9590]">📍 {location}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex-1 border border-[#e5e3de] font-semibold py-3 rounded-2xl hover:bg-[#f0ede7] transition disabled:opacity-40 text-sm"
            >
              ← {t("post_back")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-[#e8500a] text-white font-bold py-3 rounded-2xl hover:bg-[#c94208] transition disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-[0_4px_16px_rgba(232,80,10,0.28)]"
            >
              {loading ? <><Spinner /> กำลังลงประกาศ...</> : <>{t("post_submit")} ✓</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
