"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useState, useRef, useTransition } from "react";
import { fileDispute } from "@/lib/actions/escrow-actions";
import { prepareImageForUpload } from "@/lib/utils/image-upload";

interface Props {
  orderId:   string;
  itemTitle: string;
  amount:    number;
  onClose:   () => void;
  onSuccess: () => void;
}

interface PendingImage {
  preview:   string;   // blob URL shown immediately
  url:       string | null; // set after upload completes
  uploading: boolean;
  error:     string | null;
}

const MAX_IMAGES = 5;

async function uploadFile(file: File): Promise<string> {
  const { file: prepared } = await prepareImageForUpload(file);
  const fd = new FormData();
  fd.append("file", prepared);
  const res  = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url as string;
}

export default function DisputeModal({ orderId, itemTitle, amount, onClose, onSuccess }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [reason, setReason]             = useState("");
  const [images, setImages]             = useState<PendingImage[]>([]);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  // ─── Image Upload ───────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const tr = useLocaleStore((s) => s.tr);
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";           // reset so same file can be re-selected
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toAdd     = files.slice(0, remaining);
    if (!toAdd.length) return;

    // Add placeholder entries immediately so the user sees previews right away
    const startIdx = images.length;
    const placeholders: PendingImage[] = toAdd.map((f) => ({
      preview:   URL.createObjectURL(f),
      url:       null,
      uploading: true,
      error:     null,
    }));
    setImages((prev) => [...prev, ...placeholders]);

    // Upload in parallel
    await Promise.all(
      toAdd.map(async (file, i) => {
        try {
          const url = await uploadFile(file);
          setImages((prev) => {
            const next = [...prev];
            next[startIdx + i] = { ...next[startIdx + i], url, uploading: false };
            return next;
          });
        } catch (err) {
          setImages((prev) => {
            const next = [...prev];
            next[startIdx + i] = {
              ...next[startIdx + i],
              uploading: false,
              error: err instanceof Error ? err.message : tr("อัปโหลดไม่สำเร็จ"),
            };
            return next;
          });
        }
      })
    );
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
  const tr = useLocaleStore((s) => s.tr);
    e.preventDefault();
    setSubmitError(null);

    if (!reason.trim()) { setSubmitError(tr("กรุณาระบุเหตุผล")); return; }
    if (images.some((i) => i.uploading)) { setSubmitError(tr("กรุณารอให้อัปโหลดภาพเสร็จสิ้น")); return; }

    const uploadedUrls = images.filter((i) => i.url).map((i) => i.url!);
    if (uploadedUrls.length === 0) { setSubmitError(tr("กรุณาอัปโหลดหลักฐานอย่างน้อย 1 ภาพ")); return; }

    startTransition(async () => {
      const res = await fileDispute(orderId, reason, uploadedUrls);
      if (res.error) {
        setSubmitError(res.error);
      } else {
        onSuccess();
      }
    });
  }

  const stillUploading = images.some((i) => i.uploading);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[var(--c-surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-[var(--c-surface)] border-b border-[var(--c-line)] px-6 py-4 flex items-start justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-[var(--c-ink)]">{tr("แจ้งปัญหา / เปิดข้อพิพาท")}</h3>
            <p className="text-xs text-[var(--c-muted)] mt-0.5">{tr("เงินจะถูกอายัดรอการตัดสินจากผู้ดูแลระบบ")}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--c-muted)] hover:bg-[var(--c-line-soft)] hover:text-[var(--c-ink)] transition flex-shrink-0 ml-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Order Summary ───────────────────────────────────────────────────── */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between bg-[var(--c-warn-soft)] border border-[var(--c-warn-line)] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-500">⚠️</span>
              <span className="text-sm font-semibold text-amber-900 truncate">{itemTitle}</span>
            </div>
            <span className="text-sm font-bold text-amber-800 flex-shrink-0 ml-2">
              ฿{amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Form ───────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-ink-1)] mb-1.5">{tr("เหตุผลในการแจ้งปัญหา")}<span className="text-[var(--c-danger)]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setSubmitError(null); }}
              rows={4}
              disabled={isPending}
              className="w-full border border-[var(--c-line)] rounded-xl px-4 py-3 text-sm text-[var(--c-ink)] placeholder-[var(--c-faint-2)] focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition resize-none disabled:opacity-60"
              placeholder={tr("อธิบายปัญหาที่พบ เช่น ไม่ได้รับสินค้า, สินค้าไม่ตรงปก, สินค้าชำรุดเสียหาย...")}
            />
          </div>

          {/* Evidence Images */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-ink-1)] mb-0.5">{tr("หลักฐาน (รูปภาพ)")}<span className="text-[var(--c-danger)]">*</span>
            </label>
            <p className="text-xs text-[var(--c-muted)] mb-3">{tr("อย่างน้อย 1 ภาพ · สูงสุด {0} ภาพ · รูปภาพทุกชนิด ทุกขนาด", [MAX_IMAGES])}</p>

            <div className="flex flex-wrap gap-2">
              {/* Preview thumbnails */}
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden bg-[var(--c-line-soft)] border border-[var(--c-line)] flex-shrink-0"
                >
                  <img src={img.preview} alt="" className="w-full h-full object-contain" />

                  {/* Uploading spinner overlay */}
                  {img.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Upload error overlay */}
                  {img.error && (
                    <div className="absolute inset-0 bg-red-600/80 flex items-center justify-center p-1">
                      <span className="text-white text-[10px] text-center leading-tight">{tr("อัปโหลดไม่สำเร็จ")}</span>
                    </div>
                  )}

                  {/* Remove button */}
                  {!img.uploading && (
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Add-image button */}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[#d1cfc9] hover:border-red-400 hover:bg-[var(--c-danger-soft)] transition flex flex-col items-center justify-center gap-1 text-[var(--c-muted)] hover:text-[var(--c-danger)] disabled:opacity-40"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px] font-medium">{tr("เพิ่มรูป")}</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Error */}
          {submitError && (
            <div className="flex items-center gap-2 bg-[var(--c-danger-soft)] border border-[var(--c-danger-line)] rounded-xl px-4 py-3">
              <span className="text-[var(--c-danger)] text-sm">⚠️</span>
              <p className="text-sm text-[var(--c-danger)] font-medium">{submitError}</p>
            </div>
          )}

          {/* Warning notice */}
          <div className="bg-[var(--c-canvas)] rounded-xl px-4 py-3 text-xs text-[var(--c-ink-3)] leading-relaxed">
            <span className="font-semibold text-[var(--c-ink-2)]">{tr("หมายเหตุ:")}</span>{" "}
            การเปิดข้อพิพาทจะทำให้เงินถูกอายัดทันที และไม่สามารถยกเลิกได้
            ผู้ดูแลระบบจะตรวจสอบหลักฐานและตัดสินผลภายใน 2–3 วันทำการ
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl border border-[var(--c-line)] text-sm font-semibold text-[var(--c-ink-2)] hover:bg-[var(--c-canvas)] transition disabled:opacity-50"
            >{tr("ยกเลิก")}</button>
            <button
              type="submit"
              disabled={isPending || stillUploading}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{tr("กำลังส่ง…")}</>
              ) : stillUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{tr("กำลังอัปโหลด…")}</>
              ) : (
                tr("ยืนยันเปิดข้อพิพาท")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
