import type { User } from "discord.js";
import prisma from "./db.js";

interface Contact {
  id: string;
  discordId: string;
  username: string;
  lastMessage: string | null;
  lastAt: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StaffUser {
  id?: string;
  username?: string;
}

export async function recordIncoming(user: User, content: string) {
  const contact = await prisma.botDmContact.upsert({
    where: { discordId: user.id },
    update: {
      username: user.username,
      lastMessage: String(content).slice(0, 500),
      lastAt: new Date(),
      unreadCount: { increment: 1 },
    },
    create: {
      discordId: user.id,
      username: user.username,
      lastMessage: String(content).slice(0, 500),
      lastAt: new Date(),
      unreadCount: 1,
    },
  });
  await prisma.botDmMessage.create({
    data: {
      contactId: contact.id,
      direction: "user",
      authorId: user.id,
      author: user.username,
      content: String(content).slice(0, 1900),
    },
  });
  return contact;
}

export async function recordOutgoing(
  client: { users?: { fetch: (id: string) => Promise<{ send: (c: string) => Promise<unknown> }> } } | null,
  discordId: string,
  content: string,
  staffUser?: StaffUser
) {
  const contact = await prisma.botDmContact.upsert({
    where: { discordId },
    update: {
      lastMessage: String(content).slice(0, 500),
      lastAt: new Date(),
      unreadCount: 0,
    },
    create: {
      discordId,
      username: staffUser?.username || discordId,
      lastMessage: String(content).slice(0, 500),
      lastAt: new Date(),
      unreadCount: 0,
    },
  });
  await prisma.botDmMessage.create({
    data: {
      contactId: contact.id,
      direction: "staff",
      authorId: staffUser?.id || "dashboard",
      author: staffUser?.username || "Dashboard",
      content: String(content).slice(0, 1900),
    },
  });
  const user = await client?.users?.fetch(discordId).catch(() => null);
  if (user) {
    await user.send(String(content));
  }
  return contact;
}

export async function listContacts() {
  return prisma.botDmContact.findMany({ orderBy: { lastAt: "desc" } });
}

export async function thread(discordId: string) {
  const contact = await prisma.botDmContact.findUnique({ where: { discordId } });
  if (!contact) return null;
  const messages = await prisma.botDmMessage.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: "asc" },
  });
  return { contact, messages };
}

export async function markRead(discordId: string) {
  await prisma.botDmContact.update({ where: { discordId }, data: { unreadCount: 0 } });
}

export type { Contact };
