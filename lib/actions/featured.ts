"use server";

import { z }              from "zod";
import { auth }           from "@/lib/auth";
import { prisma }         from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ItemStatus }     from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult =
  | { success: true;  message: string }
  | { success: false; error:   string };

export type FeaturedItemDisplay = {
  id:          string;
  position:    number;
  customLabel: string | null;
  item: {
    id:        string;
    title:     string;
    price:     number;
    viewCount: number;
    images:    { id: string; url: string; isMain: boolean }[];
    category:  { slug: string; nameTh: string; emoji: string | null };
    seller:    {
      name:               string | null;
      image:              string | null;
      verificationStatus: string;
    };
  };
};

export type ItemSearchResult = {
  id:       string;
  title:    string;
  price:    number;
  images:   { id: string; url: string; isMain: boolean }[];
  category: { slug: string; nameTh: string; emoji: string | null };
  seller:   { name: string | null };
};

// ─── Admin guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || user.role !== "ADMIN") throw new Error("Unauthorized");
  return user as { id: string; role: string };
}

// ─── getFeaturedItems (public — used by homepage) ─────────────────────────────

export async function getFeaturedItems(
  section: string = "trending",
  limit:   number = 10
): Promise<FeaturedItemDisplay[]> {
  const now = new Date();

  const featured = await prisma.featuredItem.findMany({
    where: {
      section,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
      item: {
        status: "APPROVED" as ItemStatus,
      },
    },
    orderBy: { position: "asc" },
    take: limit,
    include: {
      item: {
        select: {
          id: true,
          title: true,
          price: true,
          viewCount: true,
          images: {
            select: { id: true, url: true, isMain: true },
            orderBy: { order: "asc" },
          },
          category: {
            select: { slug: true, nameTh: true, emoji: true },
          },
          seller: {
            select: { name: true, image: true, verificationStatus: true },
          },
        },
      },
    },
  });

  return featured.map((f) => ({
    id:          f.id,
    position:    f.position,
    customLabel: f.customLabel,
    item:        f.item,
  }));
}

// ─── getTrendingSection (with auto-fallback) ──────────────────────────────────

export async function getTrendingSection(): Promise<FeaturedItemDisplay[]> {
  const curated = await getFeaturedItems("trending", 10);

  if (curated.length >= 3) return curated;

  // Fallback: most-viewed APPROVED items
  const excludeIds = curated.map((c) => c.item.id);

  const autoTrending = await prisma.item.findMany({
    where: {
      status: "APPROVED" as ItemStatus,
      id: { notIn: excludeIds },
    },
    orderBy: { viewCount: "desc" },
    take: 10 - curated.length,
    select: {
      id: true,
      title: true,
      price: true,
      viewCount: true,
      images: {
        select: { id: true, url: true, isMain: true },
        orderBy: { order: "asc" },
      },
      category: {
        select: { slug: true, nameTh: true, emoji: true },
      },
      seller: {
        select: { name: true, image: true, verificationStatus: true },
      },
    },
  });

  return [
    ...curated,
    ...autoTrending.map((item, i) => ({
      id:          `auto-${item.id}`,
      position:    curated.length + i + 1,
      customLabel: null,
      item,
    })),
  ];
}

// ─── addToFeatured ────────────────────────────────────────────────────────────

const AddFeaturedSchema = z.object({
  itemId:      z.string().min(1),
  section:     z.string().default("trending"),
  customLabel: z.string().max(50).optional(),
  endDate:     z.string().datetime().optional(),
});

export async function addToFeatured(
  input: z.infer<typeof AddFeaturedSchema>
): Promise<ActionResult> {
  try {
    const admin  = await requireAdmin();
    const parsed = AddFeaturedSchema.parse(input);

    // Check item existence + status
    const item = await prisma.item.findUnique({
      where: { id: parsed.itemId },
      select: { status: true, title: true },
    });
    if (!item) return { success: false, error: "ไม่พบสินค้า" };
    if (item.status !== "APPROVED") {
      return { success: false, error: "สินค้านี้ไม่พร้อมขาย ไม่สามารถตั้งเป็นสินค้ามาแรงได้" };
    }

    // Check duplicate
    const existing = await prisma.featuredItem.findUnique({
      where: { itemId_section: { itemId: parsed.itemId, section: parsed.section } },
    });
    if (existing) {
      return { success: false, error: "สินค้านี้อยู่ในรายการมาแรงแล้ว" };
    }

    // Check capacity (max 10)
    const count = await prisma.featuredItem.count({
      where: { section: parsed.section },
    });
    if (count >= 10) {
      return { success: false, error: "รายการมาแรงเต็มแล้ว (สูงสุด 10 รายการ) กรุณาลบรายการเดิมก่อน" };
    }

    // Get next position
    const maxPos = await prisma.featuredItem.aggregate({
      where: { section: parsed.section },
      _max: { position: true },
    });
    const nextPos = (maxPos._max.position ?? 0) + 1;

    await prisma.featuredItem.create({
      data: {
        itemId:      parsed.itemId,
        section:     parsed.section,
        position:    nextPos,
        customLabel: parsed.customLabel ?? null,
        endDate:     parsed.endDate ? new Date(parsed.endDate) : null,
        addedBy:     admin.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/trending");
    return { success: true, message: `เพิ่ม "${item.title}" ไปยังรายการมาแรงแล้ว` };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0].message };
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── removeFromFeatured ───────────────────────────────────────────────────────

export async function removeFromFeatured(featuredId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const item = await prisma.featuredItem.findUnique({ where: { id: featuredId } });
    if (!item) return { success: false, error: "ไม่พบรายการนี้" };

    await prisma.featuredItem.delete({ where: { id: featuredId } });

    // Re-order: close gaps
    const remaining = await prisma.featuredItem.findMany({
      where: { section: item.section },
      orderBy: { position: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i + 1) {
        await prisma.featuredItem.update({
          where: { id: remaining[i].id },
          data: { position: i + 1 },
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/trending");
    return { success: true, message: "ลบออกจากรายการมาแรงแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── reorderFeatured ──────────────────────────────────────────────────────────

export async function reorderFeatured(
  section: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.featuredItem.update({
          where: { id },
          data: { position: index + 1 },
        })
      )
    );

    revalidatePath("/");
    revalidatePath("/admin/trending");
    return { success: true, message: "เรียงลำดับใหม่เรียบร้อย" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── updateFeaturedLabel ──────────────────────────────────────────────────────

export async function updateFeaturedLabel(
  featuredId: string,
  label: string | null
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.featuredItem.update({
      where: { id: featuredId },
      data: { customLabel: label },
    });
    revalidatePath("/");
    revalidatePath("/admin/trending");
    return { success: true, message: "อัปเดต label เรียบร้อย" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

// ─── searchAvailableItems ─────────────────────────────────────────────────────

export async function searchAvailableItems(
  query:   string,
  section: string = "trending"
): Promise<ItemSearchResult[]> {
  try {
    await requireAdmin();

    const featuredIds = await prisma.featuredItem.findMany({
      where: { section },
      select: { itemId: true },
    });
    const excludeIds = featuredIds.map((f) => f.itemId);

    return prisma.item.findMany({
      where: {
        status: "APPROVED" as ItemStatus,
        id: { notIn: excludeIds },
        OR: query.trim()
          ? [
              { title: { contains: query.trim(), mode: "insensitive" } },
              { seller: { name: { contains: query.trim(), mode: "insensitive" } } },
            ]
          : undefined,
      },
      take: 10,
      orderBy: { viewCount: "desc" },
      select: {
        id: true,
        title: true,
        price: true,
        images: {
          select: { id: true, url: true, isMain: true },
          orderBy: { order: "asc" },
          take: 1,
        },
        category: { select: { slug: true, nameTh: true, emoji: true } },
        seller:   { select: { name: true } },
      },
    });
  } catch {
    return [];
  }
}

// ─── getAdminFeaturedItems (admin page — includes addedBy info) ───────────────

export type AdminFeaturedItem = {
  id:          string;
  position:    number;
  customLabel: string | null;
  addedAt:     string;
  endDate:     string | null;
  item: {
    id:    string;
    title: string;
    price: number;
    images: { url: string; isMain: boolean }[];
    seller: { name: string | null };
  };
};

export async function getAdminFeaturedItems(
  section: string = "trending"
): Promise<AdminFeaturedItem[]> {
  await requireAdmin();

  const items = await prisma.featuredItem.findMany({
    where: { section },
    orderBy: { position: "asc" },
    include: {
      item: {
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          images: {
            select: { url: true, isMain: true },
            orderBy: { order: "asc" },
            take: 1,
          },
          seller: { select: { name: true } },
        },
      },
    },
  });

  return items.map((f) => ({
    id:          f.id,
    position:    f.position,
    customLabel: f.customLabel,
    addedAt:     f.addedAt.toISOString(),
    endDate:     f.endDate?.toISOString() ?? null,
    item:        f.item,
  }));
}
