import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Map MIME types to safe extensions — never trust the client filename.
//
// Every raster format a browser or phone camera produces is accepted. SVG is
// deliberately absent: these files are served from our own origin, and an SVG
// can carry a <script>, which would run as first-party code.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":    "jpg",
  "image/pjpeg":   "jpg",
  "image/png":     "png",
  "image/webp":    "webp",
  "image/gif":     "gif",
  "image/avif":    "avif",
  "image/bmp":     "bmp",
  "image/x-ms-bmp": "bmp",
  "image/tiff":    "tiff",
  "image/heic":    "heic",
  "image/heif":    "heif",
  "image/x-icon":  "ico",
};

// Pictures are downscaled in the browser before they get here (see
// lib/utils/image-upload.ts), so this is a backstop against an oversized or
// hand-crafted request rather than a limit users are meant to feel.
//
// Note for deployment: a serverless request body is capped at ~4.5 MB on
// Vercel regardless of this number, which is exactly why the client compresses.
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  // ── Auth guard ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse multipart body ───────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ── Validate MIME type ─────────────────────────────
  const ext = MIME_TO_EXT[file.type.toLowerCase()];
  if (!ext) {
    return NextResponse.json(
      {
        error: file.type === "image/svg+xml"
          ? "ไม่รองรับไฟล์ SVG ด้วยเหตุผลด้านความปลอดภัย กรุณาใช้ JPG, PNG หรือ WebP"
          : "ไฟล์ที่อัปโหลดต้องเป็นรูปภาพ",
      },
      { status: 400 }
    );
  }

  // ── Validate file size ─────────────────────────────
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `ไฟล์ขนาดใหญ่เกิน ${Math.round(MAX_BYTES / 1024 / 1024)} MB` },
      { status: 400 }
    );
  }

  // ── Write to public/uploads/ ───────────────────────
  const filename  = `${randomUUID()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");

  try {
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกไฟล์" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/uploads/${filename}` });
}
