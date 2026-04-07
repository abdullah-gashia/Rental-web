"use server";

import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── Get or create a conversation ───────────────────

export async function getOrCreateConversation(itemId: string, sellerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const buyerId = session.user.id;
  if (buyerId === sellerId) return { error: "Cannot chat with yourself" };

  // Find existing conversation for this item between these users
  const existing = await prisma.conversation.findFirst({
    where: {
      itemId,
      AND: [
        { members: { some: { id: buyerId } } },
        { members: { some: { id: sellerId } } },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, image: true } } },
      },
      item: { select: { id: true, title: true, emoji: true, price: true } },
      members: { select: { id: true, name: true, image: true } },
    },
  });

  if (existing) {
    return {
      conversation: {
        ...existing,
        messages: existing.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      },
    };
  }

  // Create new conversation
  const conv = await prisma.conversation.create({
    data: {
      itemId,
      members: { connect: [{ id: buyerId }, { id: sellerId }] },
    },
    include: {
      messages: true,
      item: { select: { id: true, title: true, emoji: true, price: true } },
      members: { select: { id: true, name: true, image: true } },
    },
  });

  return {
    conversation: {
      ...conv,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    },
  };
}

// ─── Send message ────────────────────────────────────

export async function sendMessage(conversationId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Empty message" };

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      senderId: session.user.id,
      conversationId,
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    message: {
      ...message,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

// ─── Get user conversations ─────────────────────────

export async function getUserConversations() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const convs = await prisma.conversation.findMany({
    where: { members: { some: { id: session.user.id } } },
    include: {
      item: { select: { id: true, title: true, emoji: true, price: true } },
      members: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    conversations: convs.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  };
}

// ─── Get messages for a conversation ─────────────────

export async function getMessages(conversationId: string) {
  noStore(); // always hit the DB — never serve a cached response
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: session.user.id },
      read: false,
    },
    data: { read: true },
  });

  return {
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    currentUserId: session.user.id,
  };
}
