"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  onComplete: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  agreementText: string;
  signerName: string;
  signerRole: "ผู้เช่า" | "เจ้าของ";
}

export default function SignatureCapture({ onComplete, onCancel, agreementText, signerName, signerRole }: Props) {
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
      <div className="bg-[#faf9f7] border border-[#e5e3de] rounded-xl p-4 text-sm text-[#333] leading-relaxed max-h-48 overflow-y-auto">
        <p className="font-semibold mb-2">
          ข้าพเจ้า <span className="text-[#e8500a]">{signerName}</span>{" "}
          ในฐานะ <span className="text-[#e8500a]">{signerRole}</span>
        </p>
        <pre className="whitespace-pre-wrap font-sans text-xs text-[#555]">{agreementText}</pre>
        <p className="text-[11px] text-[#aaa] mt-3">
          วันที่: {dateStr} เวลา: {timeStr} น.
        </p>
      </div>

      {/* Canvas */}
      <div>
        <p className="text-xs font-semibold text-[#555] mb-2">✍️ ลงลายเซ็นในกรอบด้านล่าง:</p>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "160px", display: "block" }}
          className="border-2 border-dashed border-[#d9d5cf] rounded-xl bg-white cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <p className="text-[11px] text-[#bbb] mt-1 text-center">ลากเพื่อเซ็นชื่อ</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-[#e5e3de] rounded-xl text-sm text-[#555] hover:bg-[#f0ede7] transition"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="button"
          onClick={clear}
          className="px-4 py-2.5 border border-[#e5e3de] rounded-xl text-sm text-[#555] hover:bg-[#f0ede7] transition"
        >
          🗑️ ล้าง
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!hasSignature}
          className="flex-1 py-2.5 bg-[#e8500a] text-white text-sm font-bold rounded-xl
                     hover:bg-[#c94208] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✅ ยืนยันลายเซ็น
        </button>
      </div>
    </div>
  );
}
