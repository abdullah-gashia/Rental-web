"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Pick a picture, then decide which part of it is the face.
 *
 * A profile photo is shown as a circle everywhere on the site, so a wide or
 * tall picture gets its edges cut off. Before this, the crop was whatever
 * `object-fit: cover` decided — usually the middle, which is rarely where the
 * person is. Here the viewer drags and zooms until the circle holds what they
 * want, and the square that comes out is exactly what everyone else will see.
 *
 * The file itself is never sent. The canvas exports the visible square at a
 * fixed 512px, which is why "any size" is genuinely fine: a 40-megapixel photo
 * is decoded in the browser and leaves as a ~100 KB WebP.
 */

const OUTPUT = 512;          // px, square — plenty for any avatar on the site
const FRAME  = 260;          // px, the on-screen editing circle
const QUALITY = 0.9;

interface Props {
  /** Current avatar, shown until a new file is chosen. */
  current: string | null;
  onSaved: (url: string) => void;
  onCancel: () => void;
}

export default function AvatarEditor({ current, onSaved, onCancel }: Props) {
  const [img, setImg]       = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom]     = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const dragging = useRef<{ x: number; y: number } | null>(null);

  /** Smallest zoom that still fills the circle — never allow gaps. */
  const minZoom = img ? Math.max(FRAME / img.width, FRAME / img.height) : 1;

  useEffect(() => {
    if (img) {
      setZoom(minZoom);
      setOffset({ x: 0, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  /** Keeps the picture covering the frame however far it is dragged. */
  const clamp = useCallback(
    (next: { x: number; y: number }, z: number) => {
      if (!img) return next;
      const w = img.width * z;
      const h = img.height * z;
      const maxX = Math.max(0, (w - FRAME) / 2);
      const maxY = Math.max(0, (h - FRAME) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [img],
  );

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    const el = new window.Image();
    el.onload = () => {
      setImg(el);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => {
      setError("เปิดไฟล์รูปนี้ไม่ได้ ลองไฟล์อื่นดูครับ");
      URL.revokeObjectURL(url);
    };
    el.src = url;
  }

  // ── Dragging ──────────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !img) return;
    setOffset(clamp({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y }, zoom));
  }
  function onPointerUp(e: React.PointerEvent) {
    dragging.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function changeZoom(next: number) {
    setZoom(next);
    setOffset((o) => clamp(o, next));
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function save() {
    if (!img) return;
    setBusy(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");

      ctx.imageSmoothingQuality = "high";
      // Fill first: a transparent PNG cropped to a circle would otherwise show
      // black once it is flattened into a JPEG somewhere downstream.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);

      // The on-screen frame is FRAME px; the export is OUTPUT px. Everything
      // scales by that ratio so what was framed is what gets written.
      const k = OUTPUT / FRAME;
      const w = img.width * zoom * k;
      const h = img.height * zoom * k;
      const x = OUTPUT / 2 - w / 2 + offset.x * k;
      const y = OUTPUT / 2 - h / 2 + offset.y * k;

      ctx.drawImage(img, x, y, w, h);

      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob(res, "image/webp", QUALITY),
      );
      if (!blob) throw new Error("encode failed");

      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.webp", { type: "image/webp" }));
      const json = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());

      if (!json.url) throw new Error(json.error ?? "อัปโหลดไม่สำเร็จ");
      onSaved(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" role="dialog" aria-modal>
      <div
        className="absolute inset-0 bg-[rgba(10,25,47,.5)] backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />

      <div className="relative w-full max-w-[420px] rounded-2xl bg-[var(--hp-bg)] border border-[var(--hp-border)] p-6">
        <h2 className="text-[17px] font-semibold text-[var(--psu-navy)]">รูปโปรไฟล์</h2>
        <p className="text-[12.5px] text-[var(--hp-muted)] mt-1 mb-5 leading-[1.8]">
          เลือกรูปขนาดไหนก็ได้ แล้วลากกับซูมให้ได้มุมที่ต้องการ
          ระบบจะบันทึกเฉพาะส่วนที่อยู่ในวงกลม
        </p>

        {/* ── The frame ────────────────────────────────────────────────── */}
        <div className="flex justify-center">
          <div
            className="relative rounded-full overflow-hidden bg-[var(--hp-subtle)] border border-[var(--hp-border-str)] touch-none select-none"
            style={{ width: FRAME, height: FRAME, cursor: img ? "grab" : "default" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width:  img.width * zoom,
                  height: img.height * zoom,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            ) : current ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current} alt="" className="w-full h-full object-cover opacity-55" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[13px] text-[var(--hp-muted)]">
                ยังไม่ได้เลือกรูป
              </div>
            )}
          </div>
        </div>

        {/* ── Zoom ─────────────────────────────────────────────────────── */}
        {img && (
          <div className="mt-5">
            <label htmlFor="avatar-zoom" className="ui-label">ซูม</label>
            <input
              id="avatar-zoom"
              type="range"
              min={minZoom}
              max={minZoom * 4}
              step={minZoom / 60}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="w-full accent-[var(--psu-blue)]"
            />
            <p className="ui-hint">ลากรูปในวงกลมเพื่อเลือกมุมที่จะแสดง</p>
          </div>
        )}

        {/* ── File ─────────────────────────────────────────────────────── */}
        <div className="mt-4">
          <label className="ui-btn ui-btn-ghost w-full cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {img ? "เลือกรูปอื่น" : "เลือกรูปจากเครื่อง"}
          </label>
          {fileName && (
            <p className="ui-hint truncate">
              {fileName}
              {img && ` · ${img.width}×${img.height} px`}
            </p>
          )}
        </div>

        {error && <div role="alert" className="ui-note ui-note-bad mt-4">{error}</div>}

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={busy} className="ui-btn ui-btn-ghost flex-1">
            ยกเลิก
          </button>
          <button onClick={save} disabled={busy || !img} className="ui-btn ui-btn-primary flex-1">
            {busy ? "กำลังบันทึก…" : "ใช้รูปนี้"}
          </button>
        </div>
      </div>
    </div>
  );
}
