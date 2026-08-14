// Suivi des MP (DMs) : enregistre chaque message reçu/envoyé, compteur de non-lus.
const prisma = require("./db");

// Enregistre un message DM entrant (user -> bot)
async function recordIncoming(user, content) {
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

// Enregistre un message sortant (staff -> user) et remet le compteur à zéro
async function recordOutgoing(client, discordId, content, staffUser) {
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
    await user.send(`**${staffUser?.username || "NDS-Shop"}** : ${content}`);
  }
  return contact;
}

// Liste des conversations
async function listContacts() {
  return prisma.botDmContact.findMany({ orderBy: { lastAt: "desc" } });
}

// Fil complet d'une conversation
async function thread(discordId) {
  const contact = await prisma.botDmContact.findUnique({ where: { discordId } });
  if (!contact) return null;
  const messages = await prisma.botDmMessage.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: "asc" },
  });
  return { contact, messages };
}

// Marque une conversation comme lue
async function markRead(discordId) {
  await prisma.botDmContact.update({ where: { discordId }, data: { unreadCount: 0 } });
}

module.exports = { recordIncoming, recordOutgoing, listContacts, thread, markRead };
