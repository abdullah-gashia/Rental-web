"use client";

import { useLocaleStore } from "@/lib/stores/locale-store";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  onComplete: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  agreementText: string;
  signerName: string;
  signerRole: "renter" | "owner";
}

export default function SignatureCapture({ onComplete, onCancel, agreementText, signerName, signerRole }: Props) {
  const tr = useLocaleStore((s) => s.tr);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [isDrawing,    setIsDrawing]    = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialise canvas with retina scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const confirm = useCallback(() => {
    if (!hasSignature || !canvasRef.current) return;
    onComplete(canvasRef.current.toDataURL("image/png"));
  }, [hasSignature, onComplete]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Agreement text */}
      <div className="bg-[var(--c-subtle)] border border-[var(--c-line)] rounded-xl p-4 text-sm text-[var(--c-ink-1)] leading-relaxed max-h-48 overflow-y-auto">
        <p className="font-semibold mb-2">{tr("ข้าพเจ้า")}<span className="text-[var(--c-accent)]">{signerName}</span>{" "}
          {tr("ในฐานะ")} <span className="text-[var(--c-accent)]">{signerRole === "renter" ? tr("ผู้เช่า") : tr("เจ้าของ")}</span>
        </p>
        <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--c-ink-2)]">{agreementText}</pre>
        <p className="text-[11px] text-[var(--c-faint)] mt-3">{tr("วันที่: {0} เวลา: {1} น.", [dateStr, timeStr])}</p>
      </div>

      {/* Canvas */}
      <div>
        <p className="text-xs font-semibold text-[var(--c-ink-2)] mb-2">{tr("✍️ ลงลายเซ็นในกรอบด้านล่าง:")}</p>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "160px", display: "block" }}
          className="border-2 border-dashed border-[#d9d5cf] rounded-xl bg-[var(--c-surface)] cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <p className="text-[11px] text-[var(--c-faint-2)] mt-1 text-center">{tr("ลากเพื่อเซ็นชื่อ")}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-[var(--c-line)] rounded-xl text-sm text-[var(--c-ink-2)] hover:bg-[var(--c-line-soft)] transition"
          >{tr("ยกเลิก")}</button>
        )}
        <button
          type="button"
          onClick={clear}
          className="px-4 py-2.5 border border-[var(--c-line)] rounded-xl text-sm text-[var(--c-ink-2)] hover:bg-[var(--c-line-soft)] transition"
        >{tr("🗑️ ล้าง")}</button>
        <button
          type="button"
          onClick={confirm}
          disabled={!hasSignature}
          className="flex-1 py-2.5 bg-[var(--c-accent)] text-white text-sm font-bold rounded-xl
                     hover:bg-[var(--c-accent-str)] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >{tr("✅ ยืนยันลายเซ็น")}</button>
      </div>
    </div>
  );
}
