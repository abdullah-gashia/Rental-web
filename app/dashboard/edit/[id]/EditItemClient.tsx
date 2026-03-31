"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateItem } from "@/lib/actions/moderation-actions";
import { useToastStore } from "@/lib/stores/toast-store";

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
}

// ─── Constants ────────────────────────────────────────

const MAX_IMAGES = 5;

const STATUS_LABELS: Record<string, string> = {
  PENDING:  "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกปฏิเสธ",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-50  text-green-700  border-green-200",
  REJECTED: "bg-red-50    text-red-700    border-red-200",
};

// ─── Upload helper ────────────────────────────────────

async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "อัปโหลดไม่สำเร็จ");
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
  return (
    <div className="relative group w-[88px] h-[88px] rounded-xl overflow-hidden border border-[#e5e3de] bg-[#f0ede7] flex-shrink-0">
      <img src={src} alt="" className="w-full h-full object-cover" />

      {/* Uploading overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[9px] text-white font-semibold">กำลังอัปโหลด</span>
        </div>
      )}

      {/* Error overlay */}
      {error && !uploading && (
        <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-1 p-1">
          <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] text-red-200 text-center leading-tight">อัปโหลดล้มเหลว</span>
        </div>
      )}

      {/* Main badge */}
      {isMain && !uploading && !error && (
        <span className="absolute bottom-1 left-1 bg-[#e8500a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
          หลัก
        </span>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
        aria-label="ลบรูปภาพ"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────

export default function EditItemClient({ item }: { item: EditableItem }) {
  // Form fields
  const [title, setTitle]             = useState(item.title);
  const [price, setPrice]             = useState(String(item.price));
  const [description, setDescription] = useState(item.description);
  const [formError, setFormError]     = useState("");

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
        showToast(`⚠️ สูงสุด ${MAX_IMAGES} รูปภาพต่อสินค้า`);
        return;
      }

      const files = selected.slice(0, available);
      if (selected.length > available) {
        showToast(`⚠️ เพิ่มได้อีก ${available} รูป (รับ ${files.length} รูปแรก)`);
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
        uploadFile(file)
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
                  ? { ...p, uploading: false, uploadError: err.message }
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
    if (!title.trim()) { setFormError("กรุณากรอกชื่อสินค้า"); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setFormError("ราคาต้องมากกว่า 0"); return; }

    // Block submit while any upload is in-flight
    const uploading = pendingImages.some((p) => p.uploading);
    if (uploading) {
      setFormError("กรุณารอให้รูปภาพอัปโหลดเสร็จก่อน");
      return;
    }

    // Surface any individual upload errors
    const failed = pendingImages.filter((p) => p.uploadError);
    if (failed.length > 0) {
      setFormError(`รูปภาพบางรูปอัปโหลดไม่สำเร็จ กรุณาลบออกแล้วลองใหม่`);
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
      });

      if (result.error) {
        setFormError(result.error);
      } else {
        showToast("✅ บันทึกสำเร็จ! สินค้าจะถูกส่งรอการอนุมัติอีกครั้ง");
        router.push("/dashboard/my-items");
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Back link */}
      <a
        href="/dashboard/my-items"
        className="inline-flex items-center gap-1.5 text-sm text-[#777] hover:text-[#111] transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        กลับไปสินค้าของฉัน
      </a>

      <h1 className="text-xl font-bold text-[#111] mb-6">แก้ไขสินค้า</h1>

      {/* Item header card */}
      <div className="bg-white rounded-2xl border border-[#e5e3de] p-4 mb-6 flex gap-4 items-center">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f0ede7] flex items-center justify-center flex-shrink-0">
          {existingImages[0] ? (
            <img src={existingImages[0].url} alt={item.title} className="w-full h-full object-cover" />
          ) : pendingImages[0]?.previewUrl ? (
            <img src={pendingImages[0].previewUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{item.emoji ?? item.category.emoji ?? "📦"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#777] mb-0.5">{item.category.nameTh}</p>
          <p className="text-sm font-semibold text-[#111] truncate">{item.title}</p>
          <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[item.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
        </div>
      </div>

      {/* Reject reason banner */}
      {item.status === "REJECTED" && item.rejectReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex gap-3 items-start">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700 mb-0.5">เหตุผลที่ถูกปฏิเสธ</p>
            <p className="text-sm text-red-700">{item.rejectReason}</p>
          </div>
        </div>
      )}

      {/* Pending-reset notice */}
      <div className="bg-[#fff8f0] border border-[#ffd4b3] rounded-xl px-4 py-3 mb-6 flex gap-3 items-start">
        <svg className="w-5 h-5 text-[#e8500a] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-[#c94208]">
          หลังบันทึก สินค้าจะถูกส่งรอการอนุมัติใหม่ และจะซ่อนจากหน้าหลักชั่วคราว
        </p>
      </div>

      {/* ── Edit Form ────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e5e3de] p-6 space-y-6">

        {/* ── Image Section ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-[#333]">รูปภาพสินค้า</label>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              totalImages >= MAX_IMAGES
                ? "bg-red-50 text-red-600"
                : "bg-[#f0ede7] text-[#777]"
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
                className="w-[88px] h-[88px] rounded-xl border-2 border-dashed border-[#d9d5cf] hover:border-[#e8500a] hover:bg-[#fff8f0] flex flex-col items-center justify-center gap-1 transition group flex-shrink-0"
              >
                <svg className="w-6 h-6 text-[#bbb] group-hover:text-[#e8500a] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] text-[#aaa] group-hover:text-[#e8500a] transition font-medium">เพิ่มรูป</span>
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-[11px] text-[#aaa] mt-2">
            JPG, PNG, WebP · สูงสุด 5 MB ต่อรูป · สูงสุด {MAX_IMAGES} รูป · รูปแรกจะเป็นรูปหลัก
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-[#f0ede7]" />

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1.5">ชื่อสินค้า</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            placeholder="ชื่อสินค้า"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1.5">
            ราคา (฿){item.listingType === "RENT" && <span className="text-[#999] font-normal"> / เดือน</span>}
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={1}
            step="0.01"
            className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition"
            placeholder="0"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#333] mb-1.5">รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full border border-[#e5e3de] rounded-xl px-4 py-2.5 text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#e8500a]/30 focus:border-[#e8500a] transition resize-none"
            placeholder="อธิบายสินค้าของคุณ..."
          />
        </div>

        {/* Error */}
        {formError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formError}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <a
            href="/dashboard/my-items"
            className="flex-1 text-center px-4 py-2.5 rounded-xl border border-[#e5e3de] text-sm font-medium text-[#555] hover:bg-[#f7f6f3] transition"
          >
            ยกเลิก
          </a>
          <button
            type="submit"
            disabled={isPending || pendingImages.some((p) => p.uploading)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#111] text-white text-sm font-semibold hover:bg-[#333] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังบันทึก...
              </>
            ) : pendingImages.some((p) => p.uploading) ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังอัปโหลดรูป...
              </>
            ) : "บันทึกและส่งอนุมัติ"}
          </button>
        </div>
      </form>
    </div>
  );
}
