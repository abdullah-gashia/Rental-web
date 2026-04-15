"use server";

import { z }              from "zod";
import { auth }           from "@/lib/auth";
import { prisma }         from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { EscrowStatus }   from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult =
  | { success: true;  message: string }
  | { success: false; error: string   };

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("กรุณาเข้าสู่ระบบ");
  return session.user as { id: string; name?: string | null; email?: string | null };
}

// ─── getSettingsData ──────────────────────────────────────────────────────────

export async function getSettingsData() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      bio: true,
      role: true,
      trustScore: true,
      walletBalance: true,
      escrowBalance: true,
      isBanned: true,
      createdAt: true,
      verificationStatus: true,
      psuIdNumber: true,
      psuIdType: true,
      verifiedAt: true,
      trackingEnabled: true,
      preferences: true,
      savedAddresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!user) throw new Error("ไม่พบบัญชีผู้ใช้");

  return {
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      verifiedAt: user.verifiedAt?.toISOString() ?? null,
      // Mask PSU ID: show first 6 chars, mask the rest, show last 1
      psuIdNumber: user.psuIdNumber
        ? user.psuIdNumber.slice(0, 6) + "***" + user.psuIdNumber.slice(-1)
        : null,
      savedAddresses: user.savedAddresses.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    },
  };
}

// ─── updateProfile ────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  name: z.string()
    .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(50, "ชื่อต้องไม่เกิน 50 ตัวอักษร"),
  phone: z.string()
    .regex(/^0\d{9}$/, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)")
    .nullable()
    .optional(),
  bio: z.string()
    .max(200, "แนะนำตัวต้องไม่เกิน 200 ตัวอักษร")
    .nullable()
    .optional(),
});

export async function updateProfile(input: {
  name: string;
  phone: string | null;
  bio: string | null;
}): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    const parsed = ProfileSchema.parse(input);

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name: parsed.name,
        phone: parsed.phone || null,
        bio: parsed.bio || null,
      },
    });

    revalidatePath("/settings");
    return { success: true, message: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว" };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0].message };
    }
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── updatePreferences ────────────────────────────────────────────────────────

const PreferencesSchema = z.object({
  notifyOrders:         z.boolean().optional(),
  notifyMessages:       z.boolean().optional(),
  notifyItemUpdates:    z.boolean().optional(),
  notifyPromotions:     z.boolean().optional(),
  emailWeeklySummary:   z.boolean().optional(),
  emailRecommendations: z.boolean().optional(),
  language:             z.enum(["th", "en"]).optional(),
  theme:                z.enum(["light", "dark", "system"]).optional(),
  showProfilePublic:    z.boolean().optional(),
  showTrustScore:       z.boolean().optional(),
});

export async function updatePreferences(
  input: z.infer<typeof PreferencesSchema>
): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    const parsed = PreferencesSchema.parse(input);

    await prisma.userPreferences.upsert({
      where: { userId: sessionUser.id },
      create: { userId: sessionUser.id, ...parsed },
      update: parsed,
    });

    revalidatePath("/settings");
    return { success: true, message: "บันทึกการตั้งค่าเรียบร้อยแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── updateTrackingPreference ─────────────────────────────────────────────────

export async function updateTrackingPreference(
  enabled: boolean
): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { trackingEnabled: enabled },
    });
    revalidatePath("/settings");
    return { success: true, message: enabled ? "เปิดการบันทึกประวัติแล้ว" : "ปิดการบันทึกประวัติแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── clearViewHistory ─────────────────────────────────────────────────────────

export async function clearViewHistory(): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    await prisma.userInteraction.deleteMany({
      where: { userId: sessionUser.id },
    });
    revalidatePath("/settings");
    return { success: true, message: "ล้างประวัติการเข้าชมเรียบร้อยแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── exportMyData ─────────────────────────────────────────────────────────────

export async function exportMyData(): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    const sessionUser = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        items: { select: { id: true, title: true, price: true, status: true, createdAt: true } },
        savedAddresses: true,
        escrowOrdersBuying: {
          select: { id: true, amount: true, status: true, createdAt: true },
        },
        escrowOrdersSelling: {
          select: { id: true, amount: true, status: true, createdAt: true },
        },
        reviewsGiven: { select: { id: true, rating: true, comment: true, createdAt: true } },
        reviewsReceived: { select: { id: true, rating: true, comment: true, createdAt: true } },
        preferences: true,
      },
    });

    if (!user) return { success: false, error: "ไม่พบบัญชีผู้ใช้" };

    // Remove sensitive fields
    const { password, ...safeUser } = user as any;
    return { success: true, data: JSON.stringify(safeUser, null, 2) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── requestAccountDeletion ───────────────────────────────────────────────────

export async function requestAccountDeletion(): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();

    // Check for active escrow orders
    const activeOrders = await prisma.escrowOrder.count({
      where: {
        OR: [
          { buyerId: sessionUser.id },
          { sellerId: sessionUser.id },
        ],
        status: {
          notIn: [
            "COMPLETED", "CANCELLED", "REFUNDED",
            "CANCELLED_BY_ADMIN", "MEETUP_COMPLETED",
            "MEETUP_CASH_COMPLETED", "COD_DELIVERED",
          ] as EscrowStatus[],
        },
      },
    });

    if (activeOrders > 0) {
      return {
        success: false,
        error: `ไม่สามารถลบบัญชีได้ คุณมีคำสั่งซื้อ ${activeOrders} รายการที่ยังไม่เสร็จสิ้น กรุณารอให้ทุกรายการเสร็จสิ้นก่อน`,
      };
    }

    // Check for escrow balance
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { escrowBalance: true },
    });

    if (user && user.escrowBalance > 0) {
      return {
        success: false,
        error: `ไม่สามารถลบบัญชีได้ คุณมียอด Escrow ค้าง ฿${user.escrowBalance.toFixed(2)} กรุณารอให้ทุกรายการเสร็จสิ้นก่อน`,
      };
    }

    // Soft-delete: mark account for deletion (30 day grace period)
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        deletionRequestedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "คำขอลบบัญชีได้รับแล้ว บัญชีจะถูกลบถาวรใน 30 วัน หากเปลี่ยนใจ สามารถเข้าสู่ระบบเพื่อยกเลิกได้",
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── createSavedAddress ───────────────────────────────────────────────────────

const AddressSchema = z.object({
  label:         z.string().min(1, "กรุณาระบุชื่อที่อยู่").max(30),
  recipientName: z.string().min(2, "กรุณาระบุชื่อผู้รับ").max(100),
  phone:         z.string().regex(/^0\d{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  addressLine1:  z.string().min(5, "กรุณาระบุที่อยู่").max(200),
  addressLine2:  z.string().max(200).optional(),
  district:      z.string().min(1, "กรุณาระบุอำเภอ/เขต").max(100),
  province:      z.string().min(1, "กรุณาระบุจังหวัด").max(100),
  postalCode:    z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ไม่ถูกต้อง"),
  note:          z.string().max(200).optional(),
  isDefault:     z.boolean().optional(),
});

export async function createSavedAddress(
  input: z.infer<typeof AddressSchema>
): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    const parsed = AddressSchema.parse(input);

    // Check max 5 addresses
    const count = await prisma.savedAddress.count({
      where: { userId: sessionUser.id },
    });
    if (count >= 5) {
      return { success: false, error: "คุณมีที่อยู่ครบ 5 รายการแล้ว กรุณาลบที่อยู่เดิมก่อนเพิ่มใหม่" };
    }

    // If setting as default, unset others first
    if (parsed.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: sessionUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first address, auto-set as default
    const shouldDefault = parsed.isDefault || count === 0;

    await prisma.savedAddress.create({
      data: {
        userId: sessionUser.id,
        label: parsed.label,
        recipientName: parsed.recipientName,
        phone: parsed.phone,
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2 || null,
        district: parsed.district,
        province: parsed.province,
        postalCode: parsed.postalCode,
        note: parsed.note || null,
        isDefault: shouldDefault,
      },
    });

    revalidatePath("/settings");
    return { success: true, message: "เพิ่มที่อยู่เรียบร้อยแล้ว" };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0].message };
    }
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── updateSavedAddress ───────────────────────────────────────────────────────

export async function updateSavedAddress(
  addressId: string,
  input: z.infer<typeof AddressSchema>
): Promise<ActionResult> {
  try {
    const sessionUser = await requireUser();
    const parsed = AddressSchema.parse(input);

    const address = await prisma.savedAddress.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== sessionUser.id) {
      return { success: false, error: "ไม่พบที่อยู่นี้" };
    }

    if (parsed.isDefault && !address.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: sessionUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.savedAddress.update({
      where: { id: addressId },
      data: {
        label: parsed.label,
        recipientName: parsed.recipientName,
        phone: parsed.phone,
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2 || null,
        district: parsed.district,
        province: parsed.province,
        postalCode: parsed.postalCode,
        note: parsed.note || null,
        isDefault: parsed.isDefault ?? address.isDefault,
      },
    });

    revalidatePath("/settings");
    return { success: true, message: "แก้ไขที่อยู่เรียบร้อยแล้ว" };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0].message };
    }
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
