"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getSavedAddresses() {
  const session = await auth();
  if (!session?.user?.id) return { addresses: [] };

  const addresses = await prisma.savedAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return {
    addresses: addresses.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  };
}

export async function deleteSavedAddress(addressId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };

  const address = await prisma.savedAddress.findUnique({
    where: { id: addressId },
  });

  if (!address) return { error: "ไม่พบที่อยู่นี้" };
  if (address.userId !== session.user.id) return { error: "ไม่มีสิทธิ์" };

  await prisma.savedAddress.delete({ where: { id: addressId } });
  return { success: true };
}

export async function setDefaultAddress(addressId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "กรุณาเข้าสู่ระบบ" };

  const address = await prisma.savedAddress.findUnique({
    where: { id: addressId },
  });
  if (!address || address.userId !== session.user.id) {
    return { error: "ไม่พบที่อยู่นี้" };
  }

  // Unset all defaults, then set this one
  await prisma.$transaction([
    prisma.savedAddress.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.savedAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  return { success: true };
}
