import { z } from "zod";

// ─── PSU ID Year Bounds ───────────────────────────────────────────────────────
const CURRENT_YEAR_BE    = new Date().getFullYear() + 543;
const MIN_STUDENT_YEAR   = 56;  // oldest realistic active student
const MAX_STUDENT_YEAR   = CURRENT_YEAR_BE % 100;

// ─── KYC Submission Schema ────────────────────────────────────────────────────

export const KycSubmissionSchema = z
  .object({
    psuIdType:           z.enum(["STUDENT", "STAFF"]),
    psuIdNumber:         z.string().min(1, "กรุณากรอกรหัสประจำตัว"),
    facultyOrDepartment: z.string().max(100).optional(),

    // File URLs — uploaded before submission
    idCardImageUrl: z.string().min(1, "กรุณาอัปโหลดรูปบัตรประจำตัว"),
    idCardBackUrl:  z.string().optional(),

    // Face liveness — may be base64 data URIs or HTTPS URLs
    selfieFrontUrl: z.string().min(1, "กรุณาถ่ายรูปยืนยันตัวตน (หน้าตรง)"),
    selfieLeftUrl:  z.string().optional(),
    selfieRightUrl: z.string().optional(),
    selfieUpUrl:    z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const id = data.psuIdNumber.trim();

    if (data.psuIdType === "STUDENT") {
      if (!/^\d{10}$/.test(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["psuIdNumber"],
          message: "รหัสนักศึกษาต้องเป็นตัวเลข 10 หลัก",
        });
        return;
      }
      const yearPrefix = parseInt(id.substring(0, 2), 10);
      if (yearPrefix < MIN_STUDENT_YEAR || yearPrefix > MAX_STUDENT_YEAR) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["psuIdNumber"],
          message: `รหัสนักศึกษาไม่ถูกต้อง (ต้องขึ้นต้นด้วย ${MIN_STUDENT_YEAR}–${MAX_STUDENT_YEAR})`,
        });
        return;
      }
    }

    if (data.psuIdType === "STAFF") {
      if (!/^\d{5}$/.test(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["psuIdNumber"],
          message: "รหัสบุคลากรต้องเป็นตัวเลข 5 หลัก",
        });
        return;
      }
    }
  });

export type KycSubmissionInput = z.infer<typeof KycSubmissionSchema>;

// ─── Admin Review Schema ──────────────────────────────────────────────────────

export const ReviewVerificationSchema = z
  .object({
    requestId:       z.string().cuid(),
    decision:        z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().max(500).optional(),
    adminNote:       z.string().max(1000).optional(),
  })
  .refine(
    (data) => data.decision !== "REJECTED" || !!data.rejectionReason?.trim(),
    { message: "กรุณาระบุเหตุผลการปฏิเสธ", path: ["rejectionReason"] }
  );

export type ReviewVerificationInput = z.infer<typeof ReviewVerificationSchema>;

// ─── Client-Side Validation Hint ─────────────────────────────────────────────

export function getIdValidationHint(
  id: string,
  type: "STUDENT" | "STAFF" | null
): { status: "valid" | "error" | "typing" | "empty"; message: string } {
  if (!id)   return { status: "empty",  message: "" };
  if (!type) return { status: "typing", message: "กรุณาเลือกประเภทก่อน" };

  const digits = id.replace(/\D/g, "");

  if (type === "STAFF") {
    if (digits.length < 5)  return { status: "typing", message: `อีก ${5  - digits.length} หลัก` };
    if (digits.length === 5) return { status: "valid",  message: "✓ รูปแบบถูกต้อง" };
    return { status: "error", message: "รหัสบุคลากรต้องมี 5 หลัก" };
  }

  // STUDENT
  if (digits.length < 2)  return { status: "typing", message: "กรอกรหัสนักศึกษา…" };

  if (digits.length >= 2) {
    const year = parseInt(digits.substring(0, 2), 10);
    if (year < MIN_STUDENT_YEAR || year > MAX_STUDENT_YEAR) {
      return { status: "error", message: `รหัสต้องขึ้นต้นด้วย ${MIN_STUDENT_YEAR}–${MAX_STUDENT_YEAR}` };
    }
  }

  if (digits.length < 10) return { status: "typing", message: `อีก ${10 - digits.length} หลัก` };
  if (digits.length === 10) return { status: "valid", message: "✓ รูปแบบถูกต้อง" };
  return { status: "error", message: "รหัสนักศึกษาต้องมี 10 หลัก" };
}
