/**
 * Client-side image preparation for /api/upload.
 *
 * The point is that a user can pick any photo straight off their phone or
 * camera — 12 MP, 40 MB, whatever — and it just works. Sending that to the
 * server as-is would not: a Next.js route handler on Vercel rejects request
 * bodies over ~4.5 MB, and nothing about the listing needs a 6000px original.
 *
 * So the browser decodes the picture, scales it down to a sane maximum edge,
 * and re-encodes it before it is ever uploaded. A 40 MB phone photo typically
 * lands well under a megabyte with no visible difference at display size.
 *
 * Anything the browser cannot decode (HEIC outside Safari, say) is uploaded
 * untouched and handled by the server's own limit.
 */

/** Longest edge kept after downscaling. Well above any display size we use. */
const MAX_EDGE = 2400;

/** WebP quality — visually lossless at this size, roughly a third of JPEG. */
const QUALITY = 0.85;

/** Below this, re-encoding usually makes the file bigger, so leave it alone. */
const SKIP_UNDER_BYTES = 300 * 1024;

export interface PreparedImage {
  file: File;
  /** True when the picture was decoded and re-encoded */
  processed: boolean;
  originalBytes: number;
  finalBytes: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns an upload-ready File. Never throws: if anything goes wrong the
 * original file comes back so the caller can still try the upload.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const untouched: PreparedImage = {
    file,
    processed: false,
    originalBytes: file.size,
    finalBytes: file.size,
  };

  // GIFs can be animated; re-encoding through a canvas would freeze them.
  if (file.type === "image/gif") return untouched;
  if (file.size <= SKIP_UNDER_BYTES) return untouched;

  try {
    // `from-image` applies the EXIF orientation, so portrait phone photos
    // don't arrive rotated on their side.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width  = Math.round(bitmap.width  * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); return untouched; }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let blob = await canvasToBlob(canvas, "image/webp", QUALITY);
    let ext  = "webp";

    // Safari below 14 has no WebP encoder; toBlob falls back to PNG there,
    // which would be larger than the original. Use JPEG when that happens.
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
      ext  = "jpg";
    }
    if (!blob) return untouched;

    // Re-encoding a small or already-compressed picture can grow it
    if (blob.size >= file.size) return untouched;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return {
      file: new File([blob], `${base}.${ext}`, { type: blob.type }),
      processed: true,
      originalBytes: file.size,
      finalBytes: blob.size,
    };
  } catch {
    // Undecodable format, out of memory, tainted canvas — upload the original
    return untouched;
  }
}

/** Prepares several files, keeping their order. */
export async function prepareImagesForUpload(files: File[]): Promise<PreparedImage[]> {
  return Promise.all(files.map(prepareImageForUpload));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
