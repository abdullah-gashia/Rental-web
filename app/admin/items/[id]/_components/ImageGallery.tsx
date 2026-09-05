"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: { id: string; url: string; isMain: boolean }[];
}

export default function ImageGallery({ images }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#dfe7f2] p-6">
        <h3 className="text-sm font-semibold text-[#3d4d66] mb-3">รูปภาพ</h3>
        <div className="aspect-[4/3] rounded-xl bg-[#f1f5fb] flex items-center justify-center">
          <div className="text-center text-[#94a3b8]">
            <span className="text-4xl block mb-2">📷</span>
            <span className="text-sm">ไม่มีรูปภาพ</span>
          </div>
        </div>
      </div>
    );
  }

  const activeImage = images[activeIdx];

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#dfe7f2] p-6">
        <h3 className="text-sm font-semibold text-[#3d4d66] mb-3">
          รูปภาพ
          <span className="text-[#94a3b8] font-normal ml-1">({images.length})</span>
        </h3>

        {/* Main Image */}
        <div
          className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#f1f5fb] cursor-zoom-in group"
          onClick={() => setLightbox(true)}
        >
          <Image
            src={activeImage.url}
            alt="รูปสินค้า"
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 60vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
          <div className="absolute bottom-3 right-3 bg-black/60 text-white rounded-lg px-2.5 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            🔍 คลิกเพื่อขยาย
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIdx(idx)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  idx === activeIdx
                    ? "border-[#2563eb] shadow-md"
                    : "border-transparent hover:border-[#d5d2cc]"
                }`}
              >
                <Image
                  src={img.url}
                  alt={`รูปที่ ${idx + 1}`}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ✕
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
                }}
                className="absolute left-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev + 1) % images.length);
                }}
                className="absolute right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors"
              >
                ›
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage.url}
              alt="รูปสินค้าขยาย"
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-full px-4 py-1.5 text-sm">
            {activeIdx + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
