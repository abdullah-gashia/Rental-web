import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Map MIME types to safe extensions — never trust the client filename
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "ไฟล์ต้องเป็น JPG, PNG, WebP หรือ GIF เท่านั้น" },
      { status: 400 }
    );
  }

  // ── Validate file size ─────────────────────────────
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ไฟล์ขนาดใหญ่เกิน 5 MB" },
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
