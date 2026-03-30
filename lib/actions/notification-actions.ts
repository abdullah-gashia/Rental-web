"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function getUnreadCounts() {
  const session = await auth();
  if (!session?.user?.id) return { notifications: 0, messages: 0 };

  const [notifCount, msgCount] = await Promise.all([
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
    prisma.message.count({
      where: {
        conversation: { members: { some: { id: session.user.id } } },
        senderId: { not: session.user.id },
        read: false,
      },
    }),
  ]);

  return { notifications: notifCount, messages: msgCount };
}

export async function markNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  return { success: true };
}

export async function markSingleNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return { success: true };
}
