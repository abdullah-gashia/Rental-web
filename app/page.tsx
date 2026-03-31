import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

export default async function Home() {
  // Items whose 24-hour deletion grace period has already expired are hidden
  // from the storefront even before a cleanup job removes them.
  const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const items = await prisma.item.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { scheduledForDeletionAt: null },                     // not scheduled
        { scheduledForDeletionAt: { gt: graceCutoff } },      // still within grace period
      ],
    },
    include: {
      seller: { select: { id: true, name: true, email: true, image: true } },
      category: { select: { id: true, slug: true, nameTh: true, nameEn: true, emoji: true } },
      images: { select: { id: true, url: true, isMain: true }, orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates to strings for client component
  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: undefined,
    scheduledForDeletionAt: item.scheduledForDeletionAt?.toISOString() ?? null,
  }));

  return <HomeClient items={serialized as any} />;
}
