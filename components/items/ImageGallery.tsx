"use client";

import { useState, useEffect, useCallback } from "react";
import type { ItemImage } from "@/lib/types";

interface ImageGalleryProps {
  images: ItemImage[];
  /** Fallback emoji shown when there are no images */
  emoji?: string | null;
  /** Fallback background colour shown when there are no images */
  color?: string | null;
  title?: string;
}

export default function ImageGallery({ images: rawImages, emoji, color, title }: ImageGalleryProps) {
  // Filter out broken relations: null entries or entries missing a url
  const images = rawImages.filter((img): img is ItemImage => !!img?.url);

  const [active, setActive]         = useState<ItemImage | null>(images[0] ?? null);
  const [lightboxOpen, setLightbox] = useState(false);

  // The gallery lives inside a modal that stays mounted while the item behind
  // it changes, so the initial useState value would keep showing the previously
  // opened item's photo. Reset whenever the image set itself changes.
  const imageKey = images.map((i) => i.id).join(",");
  useEffect(() => {
    setActive(images[0] ?? null);
    setLightbox(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey]);

  // Close lightbox on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setLightbox(false);
  }, []);

  useEffect(() => {
    if (lightboxOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, handleKeyDown]);

  // ── Empty state ───────────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div
        className="w-full aspect-square rounded-xl flex items-center justify-center"
        style={{ background: color || "var(--c-line)" }}
      >
        <span className="text-[80px]">{emoji || "📦"}</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Main display + thumbnails ───────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Main image — click to open lightbox */}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative w-full aspect-square rounded-xl overflow-hidden group bg-[var(--c-subtle-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
          aria-label="ดูรูปขยาย"
        >
          <img
            src={active?.url ?? ""}
            alt={title ?? "สินค้า"}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
          />

          {/* Zoom hint overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
              ขยายรูป
            </span>
          </div>
        </button>

        {/* Thumbnails — only rendered when more than one image */}
        {images.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((img, idx) => {
              const isActive = img.id === active?.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(img)}
                  aria-label={`รูปที่ ${idx + 1}`}
                  className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-150 focus:outline-none ${
                    isActive
                      ? "ring-2 ring-[var(--c-accent)] ring-offset-1 opacity-100"
                      : "ring-1 ring-[var(--c-line)] opacity-60 hover:opacity-100 hover:ring-[var(--c-line-str)]"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-contain bg-[var(--c-subtle-2)]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setLightbox(false)}
        >
          {/* Stop propagation so clicking the image itself doesn't close */}
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active?.url ?? ""}
              alt={title ?? "สินค้า"}
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute -top-3 -right-3 w-9 h-9 bg-[var(--c-surface)] hover:bg-[var(--c-line-soft)] text-[var(--c-ink)] rounded-full shadow-lg flex items-center justify-center transition text-lg font-bold leading-none"
              aria-label="ปิด"
            >
              ✕
            </button>

            {/* Previous / Next arrows when there are multiple images */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = images.findIndex((img) => img.id === active?.id);
                    setActive(images[(idx - 1 + images.length) % images.length]);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[var(--c-surface)]/20 hover:bg-[var(--c-surface)]/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition"
                  aria-label="รูปก่อนหน้า"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = images.findIndex((img) => img.id === active?.id);
                    setActive(images[(idx + 1) % images.length]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-[var(--c-surface)]/20 hover:bg-[var(--c-surface)]/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition"
                  aria-label="รูปถัดไป"
                >
                  ›
                </button>

                {/* Image counter */}
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                  {images.findIndex((img) => img.id === active?.id) + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
