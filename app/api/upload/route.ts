import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { sniffImageFormat, looksLikeSvg, FORMAT_EXTENSION } from "@/lib/utils/image-sniff";

// Pictures are downscaled in the browser before they get here (see
// lib/utils/image-upload.ts), so this is a backstop against an oversized or
// hand-crafted request rather than a limit users are meant to feel.
//
// Note for deployment: a serverless request body is capped at ~4.5 MB on
// Vercel regardless of this number, which is exactly why the client compresses.
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// A listing carries a handful of photos; nobody legitimately posts 60 in ten
// minutes. Stops one account from filling the disk on its own.
const RATE_LIMIT   = 60;
const RATE_WINDOW  = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  // ── Auth guard ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit, keyed per account ──────────────────
  const limit = rateLimit(`upload:${session.user.id}`, RATE_LIMIT, RATE_WINDOW);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "อัปโหลดถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
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

  // ── Size, before anything is read into memory ──────
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `ไฟล์ขนาดใหญ่เกิน ${Math.round(MAX_BYTES / 1024 / 1024)} MB` },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "ไฟล์ว่างเปล่า" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Identify by content, never by the declared type ──
  //
  // The old check trusted file.type, which the client writes. Anything at all
  // could be uploaded by labelling it "image/png"; it would then be served back
  // from this site's own origin.
  const format = sniffImageFormat(buffer);

  if (!format) {
    return NextResponse.json(
      {
        error: looksLikeSvg(buffer)
          ? "ไม่รองรับไฟล์ SVG ด้วยเหตุผลด้านความปลอดภัย กรุณาใช้ JPG, PNG หรือ WebP"
          : "ไฟล์นี้ไม่ใช่รูปภาพ กรุณาอัปโหลดไฟล์ JPG, PNG, WebP, GIF, HEIC, AVIF, BMP หรือ TIFF",
      },
      { status: 400 },
    );
  }

  // ── Write to public/uploads/ ───────────────────────
  //
  // The name is generated, never derived from the upload: a client-supplied
  // filename is how "../../.env" and "evil.php" get written.
  const filename  = `${randomUUID()}.${FORMAT_EXTENSION[format]}`;
  const uploadDir = join(process.cwd(), "public", "uploads");

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกไฟล์" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: `/uploads/${filename}` });
}
