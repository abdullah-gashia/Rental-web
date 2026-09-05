"use client";

import type { TrFn } from "@/lib/i18n/phrases";
import { useTr } from "@/lib/i18n/LocaleProvider";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateItem } from "@/lib/actions/moderation-actions";
import { useToastStore } from "@/lib/stores/toast-store";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

// ─── Types ────────────────────────────────────────────

type ItemStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNAVAILABLE" | string;

interface ExistingImage {
  id: string;
  url: string;
  isMain: boolean;
}

interface PendingImage {
  localId: string;
  previewUrl: string;    // blob URL for instant preview
  uploading: boolean;
  uploadedUrl: string | null;
  uploadError: string | null;
}

interface EditableItem {
  id: string;
  title: string;
  description: string;
  price: number;
  status: ItemStatus;
  rejectReason: string | null;
  listingType: "SELL" | "RENT";
  condition: string;
  emoji: string | null;
  color: string | null;
  category: { nameTh: string; nameEn: string; emoji: string | null };
  images: ExistingImage[];
  // Rental fields
  dailyRate?: number | null;
  securityDeposit?: number | null;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
  lateFeePerDay?: number | null;
  isRenewable?: boolean;
  maxRenewals?: number;
  rentalTerms?: string | null;
  rentalInstructions?: string | null;
}

// ─── Constants ────────────────────────────────────────

const MAX_IMAGES = 5;

const STATUS_LABELS: Record<string, string> = {
  PENDING:  "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกปฏิเสธ",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-[var(--c-warn-soft)] text-[var(--c-warn)] border-[var(--c-warn-line)]",
  APPROVED: "bg-[var(--c-ok-soft)]  text-[var(--c-ok)]  border-[var(--c-ok-line)]",
  REJECTED: "bg-[var(--c-danger-soft)]    text-[var(--c-danger)]    border-[var(--c-danger-line)]",
};

// ─── Upload helper ────────────────────────────────────

async function uploadFile(file: File, tr: TrFn): Promise<string> {
  const { file: prepared } = await prepareImageForUpload(file);
  const body = new FormData();
  body.append("file", prepared);
  const res = await fetch("/api/upload", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? tr("อัปโหลดไม่สำเร็จ"));
  return json.url as string;
}

// ─── Image thumbnail component ────────────────────────

function Thumb({
  src,
  isMain,
  uploading,
  error,
  onRemove,
}: {
  src: string;
  isMain?: boolean;
  uploading?: boolean;
  error?: string | null;
  onRemove: () => void;
}) {
  const tr = useTr();
  return (
    <div className="relative group w-[88px] h-[88px] rounded-xl overflow-hidden border border-[var(--c-line)] bg-[var(--c-line-soft)] flex-shrink-0">
      <img src={src} alt="" className="w-full h-full object-contain bg-[var(--c-subtle-2)]" />

      {/* Uploading overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[9px] text-white font-semibold">{tr("กำลังอัปโหลด")}</span>
        </div>
      )}

      {/* Error overlay */}
      {error && !uploading && (
        <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-1 p-1">
          <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] text-red-200 text-center leading-tight">{tr("อัปโหลดล้มเหลว")}</span>
        </div>
      )}

      {/* Main badge */}
      {isMain && !uploading && !error && (
        <span className="absolute bottom-1 left-1 bg-[var(--c-accent)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">{tr("หลัก")}</span>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
        aria-label={tr("ลบรูปภาพ")}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────

/**
 * The edit form, on its own page or inside a dialog.
 *
 * Editing used to mean leaving the list, and with fifty listings that is a lot
 * of navigating just to add a photo. So the seller's list opens this in a
 * dialog instead; `onDone` and `onCancel` are what it calls in place of
 * navigating, and `embedded` drops the page's own heading and back link, which
 * a dialog supplies for itself.
 */
export default function EditItemClient({
  item,
  embedded = false,
  onDone,
  onCancel,
}: {
  item: EditableItem;
  embedded?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const tr = useTr();
  // Form fields
  const [title, setTitle]             = useState(item.title);
  const [price, setPrice]             = useState(String(item.price));
  const [description, setDescription] = useState(item.description);
  const [formError, setFormError]     = useState("");

  // Rental fields (only used when listingType === "RENT")
  const [dailyRate,          setDailyRate]          = useState(String(item.dailyRate ?? ""));
  const [securityDeposit,    setSecurityDeposit]    = useState(String(item.securityDeposit ?? ""));
  const [minRentalDays,      setMinRentalDays]      = useState(String(item.minRentalDays ?? 1));
  const [maxRentalDays,      setMaxRentalDays]      = useState(String(item.maxRentalDays ?? 30));
  const [lateFeePerDay,      setLateFeePerDay]      = useState(String(item.lateFeePerDay ?? 0));
  const [isRenewable,        setIsRenewable]        = useState(item.isRenewable ?? true);
  const [maxRenewals,        setMaxRenewals]        = useState(String(item.maxRenewals ?? 1));
  const [rentalTerms,        setRentalTerms]        = useState(item.rentalTerms ?? "");
  const [rentalInstructions, setRentalInstructions] = useState(item.rentalInstructions ?? "");

  // Image state
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(item.images);
  const [pendingImages, setPendingImages]   = useState<PendingImage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToastStore((s) => s.show);
  const router = useRouter();

  // ── Derived counts ──────────────────────────────────
  const totalImages = existingImages.length + pendingImages.length;
  const canAddMore  = totalImages < MAX_IMAGES;

  // ── Remove an existing (already-in-DB) image ────────
  function removeExistingImage(id: string) {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  }

  // ── Remove a newly-added (pending) image ────────────
  function removePendingImage(localId: string) {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl); // free memory
      return prev.filter((p) => p.localId !== localId);
    });
  }

  // ── Handle file picker change ───────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      e.target.value = ""; // reset so same file can be re-picked

      if (!selected.length) return;

      const available = MAX_IMAGES - totalImages;
      if (available <= 0) {
        showToast(tr("⚠️ สูงสุด {0} รูปภาพต่อสินค้า", [MAX_IMAGES]));
        return;
      }

      const files = selected.slice(0, available);
      if (selected.length > available) {
        showToast(tr("⚠️ เพิ่มได้อีก {0} รูป (รับ {1} รูปแรก)", [available, files.length]));
      }

      // Build pending entries with instant blob previews
      const entries: PendingImage[] = files.map((file) => ({
        localId:     `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        previewUrl:  URL.createObjectURL(file),
        uploading:   true,
        uploadedUrl: null,
        uploadError: null,
      }));

      setPendingImages((prev) => [...prev, ...entries]);

      // Fire uploads in parallel — each updates its own entry
      files.forEach((file, i) => {
        const { localId } = entries[i];
        uploadFile(file, tr)
          .then((url) => {
            setPendingImages((prev) =>
              prev.map((p) =>
                p.localId === localId
                  ? { ...p, uploading: false, uploadedUrl: url }
                  : p
              )
            );
          })
          .catch((err: Error) => {
            setPendingImages((prev) =>
              prev.map((p) =>
                p.localId === localId
                  ? { ...p, uploading: false, uploadError: tr(err.message) }
                  : p
              )
            );
          });
      });
    },
    [totalImages, showToast]
  );

  // ── Form submit ──────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    // Validate text fields
    const parsedPrice = parseFloat(price);
    if (!title.trim()) { setFormError(tr("กรุณากรอกชื่อสินค้า")); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setFormError(tr("ราคาต้องมากกว่า 0")); return; }

    // Block submit while any upload is in-flight
    const uploading = pendingImages.some((p) => p.uploading);
    if (uploading) {
      setFormError(tr("กรุณารอให้รูปภาพอัปโหลดเสร็จก่อน"));
      return;
    }

    // Surface any individual upload errors
    const failed = pendingImages.filter((p) => p.uploadError);
    if (failed.length > 0) {
      setFormError(tr("รูปภาพบางรูปอัปโหลดไม่สำเร็จ กรุณาลบออกแล้วลองใหม่"));
      return;
    }

    const keepImageIds  = existingImages.map((img) => img.id);
    const newImageUrls  = pendingImages
      .filter((p) => p.uploadedUrl)
      .map((p) => p.uploadedUrl!);

    startTransition(async () => {
      const result = await updateItem(item.id, {
        title:       title.trim(),
        price:       parsedPrice,
        description: description.trim(),
        keepImageIds,
        newImageUrls,
        // Rental fields — only pass when item is RENT
        ...(item.listingType === "RENT" ? {
          dailyRate:          dailyRate          ? Number(dailyRate)          : null,
          securityDeposit:    securityDeposit    ? Number(securityDeposit)    : null,
          minRentalDays:      minRentalDays      ? Number(minRentalDays)      : 1,
          maxRentalDays:      maxRentalDays      ? Number(maxRentalDays)      : 30,
          lateFeePerDay:      lateFeePerDay      ? Number(lateFeePerDay)      : 0,
          isRenewable,
          maxRenewals:        maxRenewals        ? Number(maxRenewals)        : 1,
          rentalTerms:        rentalTerms        || null,
          rentalInstructions: rentalInstructions || null,
        } : {}),
      });

      if (result.error) {
        setFormError(tr(result.error));
      } else {
        showToast(tr("✅ บันทึกสำเร็จ! สินค้าจะถูกส่งรอการอนุมัติอีกครั้ง"));
        if (onDone) {
          onDone();
        } else {
          router.push("/dashboard/my-items");
        }
        router.refresh();
      }
    });
  }

  return (
    <div className={embedded ? "" : "max-w-xl mx-auto"}>
      {!embedded && (
        <>
          {/* Back link */}
          <a
            href="/dashboard/my-items"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--c-ink-3)] hover:text-[var(--c-ink)] transition mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>{tr("กลับไปสินค้าของฉัน")}</a>

          <h1 className="text-xl font-bold text-[var(--c-ink)] mb-6">{tr("แก้ไขสินค้า")}</h1>
        </>
      )}

      {/* Item header card */}
      <div className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-4 mb-6 flex gap-4 items-center">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--c-line-soft)] flex items-center justify-center flex-shrink-0">
          {existingImages[0] ? (
            <img src={existingImages[0].url} alt={item.title} className="w-full h-full object-contain" />
          ) : pendingImages[0]?.previewUrl ? (
            <img src={pendingImages[0].previewUrl} alt={item.title} className="w-full h-full object-contain" />
          ) : (
            <span className="text-2xl">{item.emoji ?? item.category.emoji ?? "📦"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--c-ink-3)] mb-0.5">{item.category.nameTh}</p>
          <p className="text-sm font-semibold text-[var(--c-ink)] truncate">{item.title}</p>
          <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[item.status] ?? "bg-[var(--c-subtle)] text-[var(--c-ink-3)] border-[var(--c-line)]"}`}>
            {tr(STATUS_LABELS[item.status] ?? item.status)}
          </span>
        </div>
      </div>

      {/* Reject reason banner */}
      {item.status === "REJECTED" && item.rejectReason && (
        <div className="bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-3 mb-6 flex gap-3 items-start">
          <svg className="w-5 h-5 text-[var(--c-danger)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[var(--c-danger)] mb-0.5">{tr("เหตุผลที่ถูกปฏิเสธ")}</p>
            <p className="text-sm text-[var(--c-danger)]">{item.rejectReason}</p>
          </div>
        </div>
      )}

      {/* Pending-reset notice */}
      <div className="bg-[#fff8f0] border border-[#ffd4b3] rounded-xl px-4 py-3 mb-6 flex gap-3 items-start">
        <svg className="w-5 h-5 text-[var(--c-accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-[var(--c-accent-str)]">{tr("หลังบันทึก สินค้าจะถูกส่งรอการอนุมัติใหม่ และจะซ่อนจากหน้าหลักชั่วคราว")}</p>
      </div>

      {/* ── Edit Form ────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-[var(--c-surface)] rounded-2xl border border-[var(--c-line)] p-6 space-y-6">

        {/* ── Image Section ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-[var(--c-ink-1)]">{tr("รูปภาพสินค้า")}</label>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              totalImages >= MAX_IMAGES
                ? "bg-[var(--c-danger-soft)] text-[var(--c-danger)]"
                : "bg-[var(--c-line-soft)] text-[var(--c-ink-3)]"
            }`}>
              {totalImages}/{MAX_IMAGES}
            </span>
          </div>

          {/* Thumbnail grid */}
          <div className="flex flex-wrap gap-2">

            {/* Existing images */}
            {existingImages.map((img, idx) => (
              <Thumb
                key={img.id}
                src={img.url}
                isMain={idx === 0}
                onRemove={() => removeExistingImage(img.id)}
              />
            ))}

            {/* Newly added images (uploading or done) */}
            {pendingImages.map((p) => (
              <Thumb
                key={p.localId}
                src={p.previewUrl}
                uploading={p.uploading}
                error={p.uploadError}
                onRemove={() => removePendingImage(p.localId)}
              />
            ))}

            {/* Add-photo cell */}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-[88px] h-[88px] rounded-xl border-2 border-dashed border-[#d9d5cf] hover:border-[var(--c-accent)] hover:bg-[#fff8f0] flex flex-col items-center justify-center gap-1 transition group flex-shrink-0"
              >
                <svg className="w-6 h-6 text-[var(--c-faint-2)] group-hover:text-[var(--c-accent)] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] text-[var(--c-faint)] group-hover:text-[var(--c-accent)] transition font-medium">{tr("เพิ่มรูป")}</span>
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-[11px] text-[var(--c-faint)] mt-2">{tr("รูปภาพทุกชนิด ทุกขนาด · ระบบย่อขนาดให้อัตโนมัติ · สูงสุด {0} รูป · รูปแรกจะเป็นรูปหลัก", [MAX_IMAGES])}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--c-line-soft)]" />

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1.5">{tr("ชื่อสินค้า")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
            placeholder={tr("ชื่อสินค้า")}
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1.5">
            ราคา (฿){item.listingType === "RENT" && <span className="text-[var(--c-faint)] font-normal">{tr("/ เดือน")}</span>}
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={1}
            step="0.01"
            className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition"
            placeholder="0"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--c-ink-1)] mb-1.5">{tr("รายละเอียด")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full border border-[var(--c-line)] rounded-xl px-4 py-2.5 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)] transition resize-none"
            placeholder={tr("อธิบายสินค้าของคุณ...")}
          />
        </div>

        {/* ── Rental fields (only for RENT items) ── */}
        {item.listingType === "RENT" && (
          <div className="border border-[var(--c-line)] rounded-xl p-4 space-y-4 bg-[var(--c-subtle)]">
            <p className="text-sm font-bold text-[var(--c-ink)]">{tr("🔑 ตั้งค่าการเช่า")}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("ค่าเช่า/วัน (฿) *")}</label>
                <input type="number" min={0} value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("เงินมัดจำ (฿) *")}</label>
                <input type="number" min={0} value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("เช่าขั้นต่ำ (วัน)")}</label>
                <input type="number" min={1} value={minRentalDays}
                  onChange={(e) => setMinRentalDays(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("เช่าสูงสุด (วัน)")}</label>
                <input type="number" min={1} value={maxRentalDays}
                  onChange={(e) => setMaxRentalDays(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("ค่าปรับล่าช้า/วัน (฿)")}</label>
                <input type="number" min={0} value={lateFeePerDay}
                  onChange={(e) => setLateFeePerDay(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("ต่ออายุได้สูงสุด (ครั้ง)")}</label>
                <input type="number" min={0} value={maxRenewals}
                  onChange={(e) => setMaxRenewals(e.target.value)}
                  className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isRenewable} onChange={(e) => setIsRenewable(e.target.checked)}
                className="w-4 h-4 accent-[var(--c-accent)]" />
              <span className="text-sm text-[var(--c-ink-2)]">{tr("อนุญาตให้ต่ออายุการเช่า")}</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("เงื่อนไขเพิ่มเติม")}</label>
              <textarea rows={2} value={rentalTerms} onChange={(e) => setRentalTerms(e.target.value)}
                placeholder={tr("เช่น ห้ามนำไปใช้กลางแจ้ง...")}
                className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--c-ink-2)] mb-1">{tr("คำแนะนำการใช้งาน")}</label>
              <textarea rows={2} value={rentalInstructions} onChange={(e) => setRentalInstructions(e.target.value)}
                placeholder={tr("เช่น ชาร์จด้วย USB-C เท่านั้น...")}
                className="w-full border border-[var(--c-line)] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30" />
            </div>
          </div>
        )}

        {/* Error */}
        {formError && (
          <div className="flex items-center gap-2 text-sm text-[var(--c-danger)] bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 text-center px-4 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-medium text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
            >{tr("ยกเลิก")}</button>
          ) : (
            <a
              href="/dashboard/my-items"
              className="flex-1 text-center px-4 py-2.5 rounded-xl border border-[var(--c-line)] text-sm font-medium text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition"
            >{tr("ยกเลิก")}</a>
          )}
          <button
            type="submit"
            disabled={isPending || pendingImages.some((p) => p.uploading)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--c-ink)] text-white text-sm font-semibold hover:bg-[var(--c-ink-1)] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>{tr("กำลังบันทึก...")}</>
            ) : pendingImages.some((p) => p.uploading) ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>{tr("กำลังอัปโหลดรูป...")}</>
            ) : tr("บันทึกและส่งอนุมัติ")}
          </button>
        </div>
      </form>
    </div>
  );
}
