/**
 * Identifies an image by its actual bytes.
 *
 * The Content-Type on an upload is whatever the client chose to write there, so
 * it says nothing about what the file is. A page of HTML, a PHP script or an
 * SVG full of <script> can all arrive labelled "image/png". Since these files
 * are then served back from our own origin, believing the label is how a
 * marketplace ends up hosting someone else's JavaScript.
 *
 * Everything here reads the file's own header instead. A buffer that matches
 * nothing is rejected — there is no "probably fine" branch.
 */

export type ImageFormat =
  | "jpg" | "png" | "webp" | "gif" | "avif"
  | "bmp" | "tiff" | "heic" | "ico";

const ascii = (buf: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...buf.subarray(start, start + len));

const startsWith = (buf: Uint8Array, bytes: number[]) =>
  bytes.every((b, i) => buf[i] === b);

/** ISO-BMFF brands that mean "still image", used by AVIF and by iPhone HEIC. */
const AVIF_BRANDS = ["avif", "avis"];
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];

/** The detected format, or null when the bytes are not a supported image. */
export function sniffImageFormat(buf: Uint8Array): ImageFormat | null {
  if (buf.length < 12) return null;

  // JPEG — SOI marker
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "jpg";

  // PNG — 8-byte signature
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";

  // GIF
  const gif = ascii(buf, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") return "gif";

  // WebP — RIFF container with a WEBP fourCC
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return "webp";

  // BMP
  if (ascii(buf, 0, 2) === "BM") return "bmp";

  // TIFF — little- or big-endian
  if (startsWith(buf, [0x49, 0x49, 0x2a, 0x00])) return "tiff";
  if (startsWith(buf, [0x4d, 0x4d, 0x00, 0x2a])) return "tiff";

  // ICO
  if (startsWith(buf, [0x00, 0x00, 0x01, 0x00])) return "ico";

  // AVIF / HEIC — both are ISO-BMFF: size, "ftyp", then a brand
  if (ascii(buf, 4, 4) === "ftyp") {
    const brand = ascii(buf, 8, 4).toLowerCase();
    if (AVIF_BRANDS.includes(brand)) return "avif";
    if (HEIC_BRANDS.includes(brand)) return "heic";
  }

  return null;
}

/** File extension to write for a detected format. */
export const FORMAT_EXTENSION: Record<ImageFormat, string> = {
  jpg: "jpg", png: "png", webp: "webp", gif: "gif", avif: "avif",
  bmp: "bmp", tiff: "tiff", heic: "heic", ico: "ico",
};

/**
 * SVG is detected only so the error message can explain itself.
 *
 * It is a real image format, but it is also a document that can carry script,
 * and these files are served from the site's own origin.
 */
export function looksLikeSvg(buf: Uint8Array): boolean {
  const head = ascii(buf, 0, Math.min(buf.length, 512)).trimStart().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}
