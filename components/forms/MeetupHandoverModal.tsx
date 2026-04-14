"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { confirmMeetupWithProof } from "@/lib/actions/order-transitions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  orderId:   string;
  itemTitle: string;
  buyerName: string;
  onClose:   () => void;
  onSuccess: () => void;
}

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({
  canvasRef,
  isEmpty,
  setIsEmpty,
}: {
  canvasRef:   React.RefObject<HTMLCanvasElement>;
  isEmpty:     boolean;
  setIsEmpty:  (v: boolean) => void;
}) {
  const isDrawing = useRef(false);
  const lastPos   = useRef<{ x: number; y: number } | null>(null);

  // Resize observer — re-scales canvas to match CSS width without clearing drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect  = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      // Only resize if dimensions actually changed to avoid clearing mid-draw
      if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
        canvas.width  = Math.round(rect.width  * ratio);
        canvas.height = Math.round(rect.height * ratio);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(ratio, ratio);
          ctx.strokeStyle = "#111";
          ctx.lineWidth   = 2;
          ctx.lineCap     = "round";
          ctx.lineJoin    = "round";
        }
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [canvasRef]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current   = getPos(e);
    setIsEmpty(false);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    const pos    = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw() {
    isDrawing.current = false;
    lastPos.current   = null;
  }

  function clearPad() {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#555]">✍️ ลายเซ็นผู้ซื้อ</p>
        <button
          type="button"
          onClick={clearPad}
          className="text-[10px] font-semibold text-[#9a9590] hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
        >
          ล้างลายเซ็น
        </button>
      </div>
      <div className="relative rounded-2xl border-2 border-dashed border-[#e5e3de] bg-[#fafaf8] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: 130, display: "block", cursor: "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-[#c0bdb7] font-medium select-none">
              ลงนามที่นี่ / Sign here
            </p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#9a9590]">ผู้ซื้อลงนามยืนยันรับสินค้าบนหน้าจอนี้</p>
    </div>
  );
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

function PhotoUpload({
  photoUrl,
  onUpload,
  uploading,
  setUploading,
}: {
  photoUrl:     string | null;
  onUpload:     (url: string) => void;
  uploading:    boolean;
  setUploading: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onUpload(data.url);
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#555]">📸 ภาพหลักฐานการส่งมอบ <span className="text-[#9a9590] font-normal">(ไม่บังคับ)</span></p>
      <div
        className={`relative rounded-2xl border-2 border-dashed transition cursor-pointer overflow-hidden ${
          photoUrl
            ? "border-emerald-300 bg-emerald-50"
            : "border-[#e5e3de] bg-[#fafaf8] hover:border-[#ccc]"
        }`}
        style={{ minHeight: 110 }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {photoUrl ? (
          <div className="relative">
            <img
              src={photoUrl}
              alt="หลักฐาน"
              className="w-full max-h-40 object-cover"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpload(""); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            {uploading ? (
              <svg className="w-6 h-6 text-[#9a9590] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-[#c0bdb7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            <p className="text-xs text-[#9a9590]">
              {uploading ? "กำลังอัปโหลด..." : "แตะเพื่อถ่ายภาพ หรือลากไฟล์มาวาง"}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function MeetupHandoverModal({
  orderId,
  itemTitle,
  buyerName,
  onClose,
  onSuccess,
}: Props) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const [sigEmpty, setSigEmpty]         = useState(true);
  const [photoUrl, setPhotoUrl]         = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && !submitting) onClose();
  }, [submitting, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  async function handleSubmit() {
    setError(null);

    // Extract signature as base64 PNG (trim transparent border for smaller size)
    let handoverSignature: string | undefined;
    if (!sigEmpty && canvasRef.current) {
      handoverSignature = canvasRef.current.toDataURL("image/png");
    }

    setSubmitting(true);
    const res = await confirmMeetupWithProof(orderId, {
      handoverPhotoUrl:  photoUrl ?? undefined,
      handoverSignature,
    });
    setSubmitting(false);

    if ("error" in res && res.error) {
      setError(res.error);
    } else {
      onSuccess();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div
        className="relative bg-white w-full sm:max-w-[480px] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        style={{
          maxHeight: "92dvh",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.14), 0 24px 60px rgba(0,0,0,0.16)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-[#d1cec9]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={submitting}
          aria-label="ปิด"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#f0ede7] hover:bg-[#e5e3de] flex items-center justify-center text-[#777] hover:text-[#111] transition disabled:opacity-40"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex-shrink-0 pr-14">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-base">🤝</div>
            <h2 className="text-base font-extrabold text-[#111] tracking-tight">ยืนยันการส่งมอบสินค้า</h2>
          </div>
          <p className="text-xs text-[#9a9590]">
            <span className="font-semibold text-[#555]">{itemTitle}</span>
            {" · "}ผู้ซื้อ: <span className="font-semibold text-[#555]">{buyerName}</span>
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-4 space-y-5">

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
            <p className="font-semibold mb-0.5">ก่อนกดยืนยัน:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-600">
              <li>ตรวจสอบว่าผู้ซื้อได้รับสินค้าครบถ้วนแล้ว</li>
              <li>ขอให้ผู้ซื้อลงนามยืนยันบนหน้าจอนี้</li>
              <li>ถ่ายภาพหลักฐานการส่งมอบ (แนะนำ)</li>
            </ul>
          </div>

          {/* Photo upload */}
          <PhotoUpload
            photoUrl={photoUrl}
            onUpload={(url) => setPhotoUrl(url || null)}
            uploading={uploading}
            setUploading={setUploading}
          />

          {/* Signature pad */}
          <SignaturePad
            canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
            isEmpty={sigEmpty}
            setIsEmpty={setSigEmpty}
          />

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-6 py-4 border-t border-[#e5e3de] bg-white"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl border border-[#e5e3de] text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition disabled:opacity-40"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="flex-[2] py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังดำเนินการ…
                </>
              ) : (
                "✅ ยืนยันและส่งมอบสำเร็จ"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
