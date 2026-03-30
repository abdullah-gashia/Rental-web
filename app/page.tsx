import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

export default async function Home() {
  const items = await prisma.item.findMany({
    where: { status: "ACTIVE" },
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
  }));

  return <HomeClient items={serialized as any} />;
}
