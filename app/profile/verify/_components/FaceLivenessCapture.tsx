"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type LivenessStep = "front" | "left" | "right" | "up" | "complete";

export type CapturedFrames = {
  front: string | null;
  left:  string | null;
  right: string | null;
  up:    string | null;
};

const STEP_ORDER: LivenessStep[] = ["front", "left", "right", "up", "complete"];

const STEP_META: Record<LivenessStep, { icon: string; text: string; sub: string; arrow?: "left" | "right" | "up" }> = {
  front:    { icon: "😊", text: "วางใบหน้าในกรอบ", sub: "มองตรงไปที่กล้อง" },
  left:     { icon: "⬅️", text: "หันหน้าไปทางซ้าย", sub: "หันช้าๆ แล้วค้างไว้", arrow: "left" },
  right:    { icon: "➡️", text: "หันหน้าไปทางขวา", sub: "หันช้าๆ แล้วค้างไว้", arrow: "right" },
  up:       { icon: "⬆️", text: "เงยหน้าขึ้นเล็กน้อย", sub: "เงยช้าๆ แล้วค้างไว้", arrow: "up" },
  complete: { icon: "✅", text: "ยืนยันตัวตนสำเร็จ!", sub: "จับภาพครบทุกมุมแล้ว" },
};

interface Props {
  onComplete: (frames: CapturedFrames) => void;
}

export default function FaceLivenessCapture({ onComplete }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step,        setStep]        = useState<LivenessStep>("front");
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown,   setCountdown]   = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [frames, setFrames] = useState<CapturedFrames>({ front: null, left: null, right: null, up: null });

  // Start camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().then(() => setCameraReady(true));
        }
      })
      .catch(() => {
        setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์");
      });

    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Mirror front-facing camera
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !cameraReady) return;
    setIsCapturing(true);

    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 900));
    }
    setCountdown(null);

    const frame = captureFrame();
    if (!frame) { setError("ไม่สามารถจับภาพได้ ลองใหม่อีกครั้ง"); setIsCapturing(false); return; }

    const updated = { ...frames, [step]: frame };
    setFrames(updated);

    const idx      = STEP_ORDER.indexOf(step);
    const nextStep = STEP_ORDER[idx + 1] as LivenessStep;
    setStep(nextStep);
    setIsCapturing(false);

    if (nextStep === "complete") onComplete(updated);
  }, [isCapturing, cameraReady, captureFrame, frames, step, onComplete]);

  function handleRetake() {
    setStep("front");
    setFrames({ front: null, left: null, right: null, up: null });
  }

  const meta = STEP_META[step];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Step dots */}
      <div className="flex gap-2">
        {(["front","left","right","up"] as LivenessStep[]).map((s, i) => (
          <div key={s} className={`w-2.5 h-2.5 rounded-full transition-colors ${
            STEP_ORDER.indexOf(step) > i ? "bg-emerald-500" :
            step === s                  ? "bg-blue-500"    : "bg-gray-200"
          }`} />
        ))}
      </div>

      {/* Camera viewport */}
      <div className="relative w-72 h-72 rounded-2xl overflow-hidden bg-black flex-shrink-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          playsInline
          muted
        />

        {/* Oval guide */}
        {step !== "complete" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-44 h-56 rounded-[50%] border-4 transition-colors ${
              isCapturing ? "border-yellow-400 animate-pulse" : "border-emerald-400"
            }`} />
          </div>
        )}

        {/* Direction arrows */}
        {meta.arrow === "left"  && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-4xl text-white opacity-80 animate-bounce">◀</div>}
        {meta.arrow === "right" && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-4xl text-white opacity-80 animate-bounce">▶</div>}
        {meta.arrow === "up"    && <div className="absolute top-3 left-1/2 -translate-x-1/2 text-4xl text-white opacity-80 animate-bounce">▲</div>}

        {/* Countdown */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-7xl font-black text-white">{countdown}</span>
          </div>
        )}

        {/* Complete overlay */}
        {step === "complete" && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/80">
            <span className="text-6xl">✅</span>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Instruction */}
      <div className="text-center space-y-1">
        <p className="text-2xl">{meta.icon}</p>
        <p className="font-semibold text-[#111]">{meta.text}</p>
        <p className="text-sm text-[#9a9590]">{meta.sub}</p>
      </div>

      {/* Camera error */}
      {error && !cameraReady && (
        <div className="w-full max-w-xs bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center space-y-2">
          <p>📷 {error}</p>
          <p className="text-xs">คลิกที่ไอคอน 🔒 ในแถบที่อยู่ แล้วเลือก "อนุญาต" สำหรับกล้อง</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold text-red-700 underline"
          >
            🔄 ลองใหม่
          </button>
        </div>
      )}

      {/* Capture / retake buttons */}
      {step !== "complete" ? (
        <button
          onClick={handleCapture}
          disabled={isCapturing || !cameraReady}
          className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all"
        >
          {isCapturing ? "กำลังจับภาพ…" : "📷 ถ่ายภาพ"}
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="px-6 py-2.5 border border-[#e5e3de] rounded-xl text-sm font-semibold text-[#555] hover:bg-[#f7f6f3] transition"
          >
            ถ่ายใหม่
          </button>
          <button
            onClick={() => onComplete(frames)}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
          >
            ✅ ใช้ภาพนี้
          </button>
        </div>
      )}

      {/* Thumbnail strip */}
      <div className="flex gap-2">
        {(["front","left","right","up"] as const).map((key) => (
          <div key={key} className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex items-center justify-center bg-[#f0ede7] ${
            frames[key] ? "border-emerald-400" : "border-[#e5e3de]"
          }`}>
            {frames[key]
              ? <img src={frames[key]!} alt={key} className="w-full h-full object-cover" />
              : <span className="text-[10px] text-[#9a9590]">
                  {key === "front" ? "หน้า" : key === "left" ? "ซ้าย" : key === "right" ? "ขวา" : "บน"}
                </span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}
