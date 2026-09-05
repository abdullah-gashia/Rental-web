"use client";

import { useState, useRef, useCallback } from "react";
import { useLocaleStore } from "@/lib/stores/locale-store";
import { useToastStore } from "@/lib/stores/toast-store";
import Modal from "@/components/ui/Modal";
import { createItem } from "@/lib/actions/item-actions";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

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

async function uploadFile(file: File): Promise<string> {
  const tr = useLocaleStore((s) => s.tr);
  const { file: prepared } = await prepareImageForUpload(file);
  const body = new FormData();
  body.append("file", prepared);
  const res  = await fetch("/api/upload", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? tr("อัปโหลดไม่สำเร็จ"));
  return json.url as string;
}

function Thumb({
  src, isMain, uploading, error, onRemove,
}: {
  src: string; isMain?: boolean; uploading?: boolean;
  error?: string | null; onRemove: () => void;
}) {
  const tr = useLocaleStore((s) => s.tr);
  return (
    <div className="relative group w-[80px] h-[80px] rounded-xl overflow-hidden border border-[var(--c-line)] bg-[var(--c-line-soft)] flex-shrink-0 shadow-[var(--shadow-xs)]">
      <img src={src} alt="" className="w-full h-full object-contain bg-[var(--c-subtle-2)]" />

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
          <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[9px] text-white font-semibold">{tr("อัปโหลด")}</span>
        </div>
      )}

      {error && !uploading && (
        <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-1 p-1">
          <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] text-red-200 text-center leading-tight">{tr("ล้มเหลว")}</span>
        </div>
      )}

      {isMain && !uploading && !error && (
        <span className="absolute bottom-1 left-1 bg-[var(--c-accent)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">{tr("หลัก")}</span>
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
  const tr = useLocaleStore((s) => s.tr);
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
  // Rental-specific fields
  const [rateType,        setRateType]        = useState<"DAILY" | "MONTHLY" | "YEARLY">("DAILY");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [lateFeePerDay,   setLateFeePerDay]   = useState("");
  const [minRentalDays,   setMinRentalDays]   = useState("1");
  const [maxRentalDays,   setMaxRentalDays]   = useState("30");
  const [rentalTerms,     setRentalTerms]     = useState("");
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
    setRateType("DAILY");
    setSecurityDeposit(""); setLateFeePerDay("");
    setMinRentalDays("1"); setMaxRentalDays("30"); setRentalTerms("");
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
      if (available <= 0) { showToast(tr("⚠️ สูงสุด {0} รูปภาพต่อสินค้า", [MAX_IMAGES])); return; }

      // No size gate: prepareImageForUpload() shrinks whatever the user picked
      const notImages = selected.filter((f) => !f.type.startsWith("image/"));
      if (notImages.length > 0) {
        showToast(tr("⚠️ {0} ไม่ใช่ไฟล์รูปภาพ", [notImages.map((f) => f.name).join(", ")]));
        return;
      }

      const files = selected.slice(0, available);
      if (selected.length > available) showToast(tr("⚠️ เพิ่มได้อีก {0} รูป (รับ {1} รูปแรก)", [available, files.length]));

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
          .catch((err: Error) => setPendingImages((prev) => prev.map((p) => p.localId === localId ? { ...p, uploading: false, uploadError: tr(err.message) } : p)));
      });
    },
    [totalImages, showToast]
  );

  const handleNextFromStep1 = () => {
  const tr = useLocaleStore((s) => s.tr);
    if (!category) { showToast(tr("⚠️ กรุณาเลือกหมวดหมู่ก่อน")); return; }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
  const tr = useLocaleStore((s) => s.tr);
    if (!name.trim()) { showToast(t("post_error_name")); return; }
    if (pendingImages.some((p) => p.uploading)) { showToast(tr("⚠️ กรุณารอให้รูปภาพอัปโหลดเสร็จก่อน")); return; }
    if (pendingImages.some((p) => p.uploadError)) { showToast(tr("⚠️ มีรูปภาพที่อัปโหลดไม่สำเร็จ กรุณาลบออกแล้วลองใหม่")); return; }
    setStep(3);
  };

  const handleSubmit = async () => {
  const tr = useLocaleStore((s) => s.tr);
    if (!name.trim()) { showToast(t("post_error_name")); setStep(2); return; }

    const isRent = adType === "rent";

    // Validate price / dailyRate
    const parsedPrice = Number(price);
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast(isRent ? tr("⚠️ กรุณาระบุค่าเช่าต่อวัน") : t("post_error_price"));
      return;
    }

    // Rental-specific validation
    if (isRent) {
      const parsedDeposit = Number(securityDeposit);
      if (!securityDeposit || isNaN(parsedDeposit) || parsedDeposit < 0) {
        showToast(tr("⚠️ กรุณาระบุเงินมัดจำ (0 ขึ้นไป)")); return;
      }
    }

    if (!allowShipping && !allowMeetup) { showToast(tr("⚠️ กรุณาเลือกวิธีจัดส่งอย่างน้อย 1 วิธี")); return; }

    setLoading(true);
    const imageUrls = pendingImages.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!);

    const result = await createItem({
      title: name.trim(), description: desc.trim() || "-",
      price: isRent ? 0 : parsedPrice,
      listingType: isRent ? "RENT" : "SELL",
      condition: condition as "LIKE_NEW" | "GOOD" | "FAIR" | "NEEDS_REPAIR",
      categorySlug: category, location: location || undefined,
      negotiable: isRent ? false : negotiable,
      shippable,
      allowShipping, allowMeetup, allowCOD: allowMeetup ? allowCOD : false,
      contact: contact || undefined, imageUrls,
      // Rental fields (only when RENT)
      ...(isRent ? {
        rentalRateType:  rateType,
        rentalRate:      parsedPrice,
        // Compute daily equivalent for backend calculations
        dailyRate: rateType === "DAILY"   ? parsedPrice
                 : rateType === "MONTHLY" ? Math.round((parsedPrice / 30) * 100) / 100
                 : Math.round((parsedPrice / 365) * 100) / 100,
        securityDeposit: Number(securityDeposit) || 0,
        lateFeePerDay:   Number(lateFeePerDay)   || 0,
        minRentalDays:   Math.max(1, Number(minRentalDays) || 1),
        maxRentalDays:   Math.max(1, Number(maxRentalDays) || 30),
        rentalTerms:     rentalTerms.trim() || undefined,
      } : {}),
    });

    setLoading(false);
    if (result.error === "UNVERIFIED") { setShowVerifyGate(true); return; }
    if (result.error) { showToast(`❌ ${result.error}`); return; }
    showToast(t("post_success", { name: name.trim() }));
    resetForm();
    onClose();
  };

  const handleClose = () => { resetForm(); onClose(); };

  const stepLabels = [tr("ประเภท & หมวดหมู่"), tr("รายละเอียดสินค้า"), tr("ราคา & ที่ตั้ง")];

  // ── Verification gate overlay ─────────────────────────────────────────────
  if (showVerifyGate) {
    return (
      <Modal isOpen={isOpen} onClose={() => { setShowVerifyGate(false); handleClose(); }}>
        <div className="flex flex-col items-center text-center gap-5 py-6 px-2">
          <div className="text-5xl">🔒</div>
          <div>
            <h2 className="text-xl font-bold text-[var(--c-ink)]">{tr("ต้องยืนยันตัวตนก่อน")}</h2>
            <p className="text-sm text-[var(--c-muted)] mt-2 leading-relaxed">{tr("คุณต้องยืนยันตัวตน PSU ก่อนจึงจะลงขายสินค้าได้")}<br />{tr("กระบวนการใช้เวลาประมาณ 2-3 นาที")}</p>
          </div>
          <div className="bg-[var(--c-canvas)] rounded-2xl px-5 py-4 text-left text-sm space-y-2 w-full">
            {[tr("อัปโหลดรูปบัตรประจำตัว PSU"), tr("ถ่ายรูปยืนยันใบหน้า (Face Liveness)"), tr("รอแอดมินอนุมัติภายใน 24 ชั่วโมง")].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--c-accent)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-[var(--c-ink-1)]">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setShowVerifyGate(false); handleClose(); }}
              className="flex-1 py-2.5 border border-[var(--c-line)] rounded-xl text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
            >{tr("ยกเลิก")}</button>
            <a
              href="/profile/verify"
              className="flex-1 py-2.5 bg-[var(--c-accent)] text-white rounded-xl text-sm font-bold text-center hover:bg-[var(--c-accent-str)] transition"
            >{tr("ยืนยันตัวตน →")}</a>
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
          <h2 className="text-xl font-extrabold text-[var(--c-ink)] tracking-tight">{t("post_title")}</h2>
          <p className="text-[12px] text-[var(--c-muted)] mt-0.5 font-medium">{tr("ขั้นตอน {0}/3 — {1}", [step, stepLabels[step - 1]])}</p>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-ink)] hover:bg-[var(--c-line-soft)] transition flex-shrink-0"
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
              d < step ? "bg-[#10b981]" : d === step ? "bg-[var(--c-ink)]" : "bg-[var(--c-line)]"
            }`}
          />
        ))}
      </div>

      {/* ── Step 1 ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="fade-up">
          <p className="text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-3">{t("post_type_label")}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(["sell", "rent"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAdType(type)}
                className={`rounded-2xl p-4 text-center transition-all border-2 ${
                  adType === type
                    ? "border-[var(--c-ink)] bg-[var(--c-surface)] shadow-[var(--shadow-sm)]"
                    : "border-[var(--c-line)] bg-[var(--c-subtle)] hover:border-[var(--c-faint)]"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 text-xl ${
                  type === "sell" ? "bg-[var(--c-warn-soft)]" : "bg-[var(--c-accent-soft)]"
                }`}>
                  {type === "sell" ? "🏷️" : "🔑"}
                </div>
                <p className="text-sm font-bold text-[var(--c-ink)]">{t(type === "sell" ? "post_type_sell" : "post_type_rent")}</p>
                <p className="text-[11px] text-[var(--c-muted)] mt-0.5 leading-tight">{t(type === "sell" ? "post_type_sell_desc" : "post_type_rent_desc")}</p>
              </button>
            ))}
          </div>

          <p className="text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-2">{t("post_category_label")}</p>
          <div className="relative mb-5">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm bg-[var(--c-surface)] appearance-none pr-10 transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)] outline-none cursor-pointer"
            >
              <option value="">{t("post_category_placeholder")}</option>
              <option value="secondhand">{t("cat_secondhand")}</option>
              <option value="electronics">{t("cat_electronics")}</option>
              <option value="vehicles">{t("cat_vehicles")}</option>
              <option value="boardgames">{t("cat_boardgames")}</option>
              <option value="books">{t("cat_books")}</option>
              <option value="rental">{t("cat_rental")}</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            onClick={handleNextFromStep1}
            className="w-full bg-[var(--c-ink)] text-white font-bold py-3 rounded-2xl hover:bg-[var(--c-ink-1)] transition shadow-[var(--shadow-sm)] text-sm"
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
              <p className="text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest">{t("post_photos_label")}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalImages >= MAX_IMAGES
                  ? "bg-[var(--c-danger-soft)] text-[var(--c-danger)] border border-[var(--c-danger-line)]"
                  : "bg-[var(--c-line-soft)] text-[var(--c-ink-3)]"
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
                  className="w-[80px] h-[80px] rounded-xl border-2 border-dashed border-[#d9d5cf] hover:border-[var(--c-accent)] hover:bg-[var(--c-warn-soft)]/50 flex flex-col items-center justify-center gap-1 transition group flex-shrink-0"
                >
                  <svg className="w-5 h-5 text-[var(--c-line-str)] group-hover:text-[var(--c-accent)] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] text-[var(--c-faint-2)] group-hover:text-[var(--c-accent)] transition font-semibold">{tr("เพิ่มรูป")}</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            <p className="text-[11px] text-[var(--c-faint-2)] mt-1.5">{tr("รูปภาพทุกชนิด ทุกขนาด · ระบบย่อขนาดให้อัตโนมัติ · รูปแรกเป็นรูปหลัก")}</p>
          </div>

          <div className="space-y-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{t("post_name_label")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder={t("post_name_placeholder")}
                className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{t("post_desc_label")}</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder={t("post_desc_placeholder")}
                className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm resize-none outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-2">{t("post_condition_label")}</label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(c.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                    condition === c.key
                      ? "border-[var(--c-ink)] bg-[var(--c-ink)] text-white"
                      : "border-[var(--c-line)] hover:border-[var(--c-ink)] text-[var(--c-ink-2)]"
                  }`}
                >
                  {tr(c.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 border border-[var(--c-line)] font-semibold py-3 rounded-2xl hover:bg-[var(--c-line-soft)] transition text-sm">
              ← {t("post_back")}
            </button>
            <button
              onClick={handleNextFromStep2}
              disabled={pendingImages.some((p) => p.uploading)}
              className="flex-1 bg-[var(--c-ink)] text-white font-bold py-3 rounded-2xl hover:bg-[var(--c-ink-1)] transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-[var(--shadow-sm)]"
            >
              {pendingImages.some((p) => p.uploading) ? <><Spinner />{tr("กำลังอัปโหลด...")}</> : <>{t("post_next")} →</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="fade-up">

          {/* ── SELL: price + negotiable ─── */}
          {adType === "sell" && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{t("post_price_label")}</label>
                <div className="relative">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number" min="0"
                    placeholder={t("post_price_placeholder")}
                    className="w-full border border-[var(--c-line)] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--c-muted)]">{`฿`}</span>
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--c-ink-2)] bg-[var(--c-subtle)] border border-[var(--c-line)] rounded-xl px-4 py-2.5 hover:bg-[var(--c-line-soft)] transition">
                <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="rounded w-4 h-4 accent-[var(--c-accent)]" />
                <span className="font-medium">{t("post_negotiable")}</span>
              </label>
            </div>
          )}

          {/* ── RENT: rental-specific fields ─── */}
          {adType === "rent" && (
            <div className="space-y-3 mb-4">
              <div className="bg-[var(--c-accent-soft)] border border-blue-100 rounded-xl px-4 py-2.5 mb-1">
                <p className="text-[11px] font-bold text-[var(--c-accent-str)] uppercase tracking-widest">{tr("ตั้งค่าการเช่า")}</p>
              </div>

              {/* Rate + rate type */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{tr("ค่าเช่า")}<span className="text-[var(--c-danger)]">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      type="number" min="1"
                      placeholder={rateType === "DAILY" ? tr("เช่น 80") : rateType === "MONTHLY" ? tr("เช่น 500") : tr("เช่น 6000")}
                      className="w-full border border-[var(--c-line)] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--c-muted)]">{`฿`}</span>
                  </div>
                  <div className="flex border border-[var(--c-line)] rounded-xl overflow-hidden flex-shrink-0">
                    {(["DAILY", "MONTHLY", "YEARLY"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRateType(t)}
                        className={`px-3 py-2.5 text-xs font-semibold transition ${
                          rateType === t
                            ? "bg-[var(--c-ink)] text-white"
                            : "text-[var(--c-ink-2)] hover:bg-[var(--c-line-soft)]"
                        }`}
                      >
                        {t === "DAILY" ? tr("/วัน") : t === "MONTHLY" ? tr("/เดือน") : tr("/ปี")}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Rate equivalents preview */}
                {price && Number(price) > 0 && (() => {
                  const n = Number(price);
                  const perDay = rateType === "DAILY" ? n : rateType === "MONTHLY" ? n / 30 : n / 365;
                  const perMonth = perDay * 30;
                  const perYear = perDay * 365;
                  return (
                    <p className="text-[11px] text-[var(--c-accent)] mt-1.5 bg-[var(--c-accent-soft)] rounded-lg px-2.5 py-1.5">{tr("💡 เทียบเท่า: ฿{0}/วัน · ฿{1}/เดือน · ฿{2}/ปี", [perDay.toFixed(1), Math.round(perMonth), Math.round(perYear)])}</p>
                  );
                })()}
              </div>

              {/* Security deposit */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{tr("เงินมัดจำ")}<span className="text-[var(--c-danger)]">*</span>
                </label>
                <div className="relative">
                  <input
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    type="number" min="0"
                    placeholder={tr("เช่น 500")}
                    className="w-full border border-[var(--c-line)] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--c-muted)]">{`฿`}</span>
                </div>
                <p className="text-[11px] text-[var(--c-faint)] mt-1">{tr("คืนให้ผู้เช่าหลังตรวจสอบสภาพสินค้า")}</p>
              </div>

              {/* Late fee */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{tr("ค่าปรับคืนช้า (ต่อวัน)")}</label>
                <div className="relative">
                  <input
                    value={lateFeePerDay}
                    onChange={(e) => setLateFeePerDay(e.target.value)}
                    type="number" min="0"
                    placeholder={tr("0 = ไม่คิดค่าปรับ")}
                    className="w-full border border-[var(--c-line)] rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--c-muted)]">{`฿`}</span>
                </div>
              </div>

              {/* Min / Max rental days */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{tr("เช่าขั้นต่ำ")}</label>
                  <div className="relative">
                    <input
                      value={minRentalDays}
                      onChange={(e) => setMinRentalDays(e.target.value)}
                      type="number" min="1" max="365"
                      className="w-full border border-[var(--c-line)] rounded-xl pl-4 pr-12 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--c-muted)]">{tr("วัน")}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{tr("เช่าสูงสุด")}</label>
                  <div className="relative">
                    <input
                      value={maxRentalDays}
                      onChange={(e) => setMaxRentalDays(e.target.value)}
                      type="number" min="1" max="365"
                      className="w-full border border-[var(--c-line)] rounded-xl pl-4 pr-12 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--c-muted)]">{tr("วัน")}</span>
                  </div>
                </div>
              </div>

              {/* Rental terms */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{tr("เงื่อนไขการเช่า (ไม่บังคับ)")}</label>
                <textarea
                  value={rentalTerms}
                  onChange={(e) => setRentalTerms(e.target.value)}
                  rows={2}
                  placeholder={'เช่น tr("ห้ามแกะชิ้นส่วน"), tr("คืนพร้อมกล่องและอุปกรณ์ครบ")'}
                  className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm resize-none outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{t("post_location_label")}</label>
              <div className="relative">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm bg-[var(--c-surface)] appearance-none pr-10 outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)] cursor-pointer"
                >
                  <option value="">{t("post_location_placeholder")}</option>
                  <option>{tr("หอพักนักศึกษา")}</option>
                  <option>{tr("อาคาร CoC")}</option>
                  <option>{tr("อาคาร SC")}</option>
                  <option>{tr("โรงอาหาร")}</option>
                  <option>{tr("หน้า 7-11")}</option>
                  <option>{tr("อื่นๆ")}</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Delivery & Payment config ─────────────────── */}
          <div className="mb-4 rounded-2xl border border-[var(--c-line)] overflow-hidden">
            <div className="bg-[var(--c-subtle)] px-4 py-2.5 border-b border-[var(--c-line)]">
              <p className="text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest">{tr("ตั้งค่าการจัดส่งและชำระเงิน")}</p>
            </div>

            {/* Delivery */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-[var(--c-faint)] uppercase tracking-widest mb-2">{tr("วิธีจัดส่ง")}</p>
              <div className="space-y-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAllowShipping((v) => v || !allowMeetup ? !v : false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition text-left ${
                    allowShipping ? "border-[var(--c-ink)] bg-[var(--c-surface)]" : "border-[var(--c-line)] bg-[var(--c-subtle)] hover:border-[var(--c-faint)]"
                  }`}
                >
                  <span className="text-lg">📦</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-ink)]">{tr("จัดส่งทางไปรษณีย์")}</p>
                    <p className="text-[11px] text-[var(--c-muted)]">{tr("ผู้ซื้อรับสินค้าทางไปรษณีย์")}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    allowShipping ? "border-[var(--c-ink)] bg-[var(--c-ink)]" : "border-[var(--c-line-str)]"
                  }`}>
                    {allowShipping && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAllowMeetup((v) => v || !allowShipping ? !v : false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition text-left ${
                    allowMeetup ? "border-[var(--c-ink)] bg-[var(--c-surface)]" : "border-[var(--c-line)] bg-[var(--c-subtle)] hover:border-[var(--c-faint)]"
                  }`}
                >
                  <span className="text-lg">🤝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-ink)]">{tr("นัดรับสินค้า")}</p>
                    <p className="text-[11px] text-[var(--c-muted)]">{tr("ผู้ซื้อมารับด้วยตนเอง (ใน PSU)")}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    allowMeetup ? "border-[var(--c-ink)] bg-[var(--c-ink)]" : "border-[var(--c-line-str)]"
                  }`}>
                    {allowMeetup && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              </div>
              {!allowShipping && !allowMeetup && (
                <p className="text-[11px] text-[var(--c-danger)] font-medium mb-2">{tr("⚠️ ต้องเลือกอย่างน้อย 1 วิธี")}</p>
              )}
            </div>

            {/* Payment */}
            <div className="px-4 pt-1 pb-3 border-t border-[var(--c-line-soft)]">
              <p className="text-[10px] font-bold text-[var(--c-faint)] uppercase tracking-widest mb-2 mt-2">{tr("วิธีชำระเงิน")}</p>
              <div className="space-y-2">
                {/* Escrow — always enabled */}
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 border-[#10b981]/40 bg-[#f0fdf4]">
                  <span className="text-lg">🔒</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-ink)]">{tr("โอนผ่าน Escrow")}</p>
                    <p className="text-[11px] text-[var(--c-muted)]">{tr("เงินโอนให้ผู้ขายหลังยืนยันรับสินค้า")}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#10b981] bg-[#dcfce7] px-2 py-0.5 rounded-full">{tr("บังคับใช้")}</span>
                </div>

                {/* COD — only meaningful when meetup is on */}
                <button
                  type="button"
                  disabled={!allowMeetup}
                  onClick={() => setAllowCOD((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition text-left ${
                    !allowMeetup
                      ? "border-[var(--c-line)] bg-[#f7f7f7] opacity-40 cursor-not-allowed"
                      : allowCOD
                        ? "border-[var(--c-ink)] bg-[var(--c-surface)]"
                        : "border-[var(--c-line)] bg-[var(--c-subtle)] hover:border-[var(--c-faint)]"
                  }`}
                >
                  <span className="text-lg">💵</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-ink)]">{tr("เก็บเงินปลายทาง (COD)")}</p>
                    <p className="text-[11px] text-[var(--c-muted)]">{tr("ชำระเงินสดตอนนัดรับ")}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    allowMeetup && allowCOD ? "border-[var(--c-ink)] bg-[var(--c-ink)]" : "border-[var(--c-line-str)]"
                  }`}>
                    {allowMeetup && allowCOD && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-bold text-[var(--c-ink-3)] uppercase tracking-widest mb-1.5">{t("post_contact_label")}</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              type="text"
              placeholder={t("post_contact_placeholder")}
              className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm outline-none transition focus:border-[var(--c-ink)] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]"
            />
          </div>

          {/* Preview card */}
          {name && (
            <div className="mb-5 p-4 bg-gradient-to-br from-[var(--c-subtle)] to-[var(--c-line-soft)] border border-[var(--c-line)] rounded-2xl">
              <p className="text-[10px] font-bold text-[var(--c-muted)] uppercase tracking-widest mb-3">{t("post_preview_label")}</p>
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-[var(--c-line)] flex items-center justify-center shadow-[var(--shadow-xs)]">
                  {pendingImages[0]?.previewUrl ? (
                    <img src={pendingImages[0].previewUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--c-ink)] truncate">{name}</p>
                  <p className="text-base font-extrabold text-[var(--c-accent)]">
                    {price ? `฿${Number(price).toLocaleString()}${adType === "rent" ? tr("/วัน") : ""}` : "—"}
                  </p>
                  {location && <p className="text-xs text-[var(--c-muted)]">📍 {location}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex-1 border border-[var(--c-line)] font-semibold py-3 rounded-2xl hover:bg-[var(--c-line-soft)] transition disabled:opacity-40 text-sm"
            >
              ← {t("post_back")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-[var(--c-accent)] text-white font-bold py-3 rounded-2xl hover:bg-[var(--c-accent-str)] transition disabled:opacity-70 flex items-center justify-center gap-2 text-sm shadow-[0_4px_16px_rgba(232,80,10,0.28)]"
            >
              {loading ? <><Spinner />{tr("กำลังลงประกาศ...")}</> : <>{t("post_submit")} ✓</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
