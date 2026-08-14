// Dashboard du bot NDS-Shop — bot.db-nds-shop.fr
// Auth via Better Auth (mêmes comptes que upload). API + front statique.
const express = require("express");
const path = require("path");
const { toNodeHandler, fromNodeHeaders } = require("better-auth/node");
const auth = require("./lib/auth");
const prisma = require("./lib/db");
const { botLog } = require("./lib/botLog");
const { listGames } = require("./lib/api");
const { GUILD_ID, CHANNELS } = require("./config");

function createDashboard(client) {
  const app = express();
  app.use(express.json());
  // Front React (buildé) — frontend/dist
  const dist = path.join(__dirname, "frontend", "dist");
  app.use(express.static(dist));
  app.get("/", (_req, res) => res.sendFile(path.join(dist, "index.html")));

  // Better Auth : /api/auth/* (login avec comptes upload, session)
  app.all("/api/auth/{*path}", toNodeHandler(auth));

  // Middleware : vérifie la session Better Auth
  async function requireAuth(req, res, next) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: "Non connecté" });
    req.user = session.user;
    next();
  }

  function guildInfo() {
    const guild = client?.guilds?.cache.get(GUILD_ID) || null;
    if (!guild) return null;
    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      channels: guild.channels.cache.size,
    };
  }

  // ---- Auth ----
  app.get("/api/session", async (req, res) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    res.json({ user: session?.user || null });
  });

  // ---- Status ----
  app.get("/api/status", requireAuth, async (req, res) => {
    const guild = guildInfo();
    let games = 0;
    try {
      games = (await listGames()).length;
    } catch {}
    res.json({
      bot: { online: client.isReady(), username: client.user?.tag || null, uptime: client.uptime || 0 },
      guild,
      games,
      user: req.user,
    });
  });

  // ---- Jeux (recherche) ----
  app.get("/api/games", requireAuth, async (req, res) => {
    try {
      let games = await listGames();
      const q = String(req.query.search || "").toLowerCase();
      if (q) {
        games = games.filter(
          (g) => g.title.toLowerCase().includes(q) || (g.author || "").toLowerCase().includes(q)
        );
      }
      res.json(games.slice(0, 200));
    } catch {
      res.json([]);
    }
  });

  // ---- Salons textuels ----
  app.get("/api/channels", requireAuth, (req, res) => {
    const guild = client?.guilds?.cache.get(GUILD_ID);
    if (!guild) return res.json([]);
    const chans = guild.channels.cache
      .filter((c) => c.isTextBased() && c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        parent: c.parent?.name || "",
      }))
      .sort((a, b) => a.parent.localeCompare(b.parent) || a.name.localeCompare(b.name));
    res.json(chans);
  });

  // ---- Annonces ----
  app.get("/api/announcements", requireAuth, async (_req, res) => {
    const items = await prisma.botAnnouncement.findMany({ orderBy: { createdAt: "desc" } });
    res.json(items);
  });

  app.post("/api/announcements", requireAuth, async (req, res) => {
    const { title, content, channel } = req.body;
    if (!title || !content || !channel) {
      return res.status(400).json({ error: "title, content, channel requis" });
    }
    const item = await prisma.botAnnouncement.create({
      data: { title, content, channel, status: "draft", sentBy: req.user.username },
    });
    await botLog("info", `Annonce créée : ${title}`);
    res.json(item);
  });

  app.put("/api/announcements/:id", requireAuth, async (req, res) => {
    const { title, content, channel } = req.body;
    const item = await prisma.botAnnouncement.update({
      where: { id: req.params.id },
      data: { title, content, channel },
    });
    res.json(item);
  });

  app.delete("/api/announcements/:id", requireAuth, async (req, res) => {
    await prisma.botAnnouncement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  // Envoi d'une annonce par le bot (statut -> sent)
  app.post("/api/announcements/:id/send", requireAuth, async (req, res) => {
    const item = await prisma.botAnnouncement.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Annonce introuvable" });

    const guild = client?.guilds?.cache.get(GUILD_ID);
    const channel = guild?.channels?.cache.find((c) => c.name === item.channel && c.isTextBased());
    if (!channel) {
      return res.status(400).json({ error: `Salon #${item.channel} introuvable` });
    }
    try {
      await channel.send({ content: item.content });
    } catch (err) {
      return res.status(500).json({ error: `Envoi échoué : ${err.message}` });
    }
    await prisma.botAnnouncement.update({
      where: { id: item.id },
      data: { status: "sent", sentAt: new Date(), sentBy: req.user.username },
    });
    await botLog("info", `Annonce envoyée : ${item.title} -> #${item.channel}`);
    res.json({ ok: true });
  });

  // ---- Message ad-hoc vers un salon ----
  app.post("/api/send", requireAuth, async (req, res) => {
    const { channelId, content } = req.body;
    if (!channelId || !content) return res.status(400).json({ error: "channelId, content requis" });
    const guild = client?.guilds?.cache.get(GUILD_ID);
    const channel = guild?.channels?.cache.get(channelId);
    if (!channel?.isTextBased()) return res.status(400).json({ error: "Salon invalide" });
    try {
      await channel.send({ content });
      await botLog("info", `Message envoyé par ${req.user.username} -> #${channel.name}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Logs ----
  app.get("/api/logs", requireAuth, async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await prisma.botLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    res.json(logs);
  });

  // ---- Settings ----
  app.get("/api/settings", requireAuth, async (_req, res) => {
    const rows = await prisma.botSetting.findMany();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  });

  app.put("/api/settings/:key", requireAuth, async (req, res) => {
    const { key } = req.params;
    const value = String(req.body.value ?? "");
    await prisma.botSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ ok: true });
  });

  // ---- Déclenchement manuel du poll de nouveaux jeux ----
  app.post("/api/poll", requireAuth, async (_req, res) => {
    try {
      if (typeof client?.pollNow === "function") {
        await client.pollNow();
        res.json({ ok: true });
      } else {
        res.status(400).json({ error: "Bot hors ligne — poll indisponible" });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Tickets (staff) ----
  app.get("/api/tickets", requireAuth, async (req, res) => {
    const status = req.query.status || "all";
    const where = status === "all" ? {} : { status };
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    res.json(tickets);
  });

  app.post("/api/tickets/:id/reply", requireAuth, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "content requis" });
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: req.user.id, author: req.user.username, content, direction: "staff" },
    });
    const user = await client?.users?.fetch(ticket.userId).catch(() => null);
    if (user) await user.send(`**${req.user.username}** : ${content}`);
    await botLog("info", `Réponse staff au ticket ${ticket.id}`);
    res.json({ ok: true });
  });

  app.post("/api/tickets/:id/close", requireAuth, async (req, res) => {
    const { closeTicket } = require("./lib/tickets");
    await closeTicket(client, req.params.id, req.user.username);
    res.json({ ok: true });
  });

  app.post("/api/tickets/:id/reopen", requireAuth, async (req, res) => {
    await prisma.ticket.update({ where: { id: req.params.id }, data: { status: "open", closedAt: null } });
    res.json({ ok: true });
  });

  // ---- Users (profils bot) ----
  app.get("/api/users", requireAuth, async (req, res) => {
    const search = String(req.query.search || "");
    const profiles = await prisma.userProfile.findMany({ orderBy: { xp: "desc" }, take: 100 });
    const guild = client?.guilds?.cache.get(GUILD_ID);
    const out = [];
    for (const p of profiles) {
      if (search && !p.discordId.includes(search)) continue;
      const member = guild?.members?.cache.get(p.discordId);
      out.push({
        discordId: p.discordId,
        username: member?.user?.username || p.discordId,
        xp: Number(p.xp),
        level: p.level,
        totalMsgs: p.totalMsgs,
        favorites: p.favorites ? JSON.parse(p.favorites) : [],
      });
    }
    res.json(out);
  });

  // ---- Leveling config ----
  app.get("/api/leveling", requireAuth, async (_req, res) => {
    const row = await prisma.botSetting.findUnique({ where: { key: "levelingConfig" } });
    res.json(row?.value ? JSON.parse(row.value) : { enabled: true, xpPerMessage: 15, excludedChannels: [], roles: [] });
  });

  app.put("/api/leveling", requireAuth, async (req, res) => {
    await prisma.botSetting.upsert({
      where: { key: "levelingConfig" },
      update: { value: JSON.stringify(req.body) },
      create: { key: "levelingConfig", value: JSON.stringify(req.body) },
    });
    res.json({ ok: true });
  });

  // ---- Permissions matrix ----
  app.get("/api/permissions", requireAuth, async (_req, res) => {
    const { getMatrix, ROLE_ORDER } = require("./lib/permissions");
    res.json({ matrix: await getMatrix(), roles: ROLE_ORDER });
  });

  app.put("/api/permissions", requireAuth, async (req, res) => {
    const { saveMatrix } = require("./lib/permissions");
    await saveMatrix(req.body.matrix || {});
    res.json({ ok: true });
  });

  // ---- Commandes log ----
  app.get("/api/commands", requireAuth, async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await prisma.botCommandLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    res.json(logs);
  });

  // ---- Blacklist ----
  app.get("/api/blacklist", requireAuth, async (_req, res) => {
    res.json(await prisma.blacklist.findMany({ orderBy: { createdAt: "desc" } }));
  });

  app.post("/api/blacklist", requireAuth, async (req, res) => {
    const { discordId, reason } = req.body;
    if (!discordId) return res.status(400).json({ error: "discordId requis" });
    await prisma.blacklist.upsert({
      where: { discordId },
      update: { reason: reason || null },
      create: { discordId, reason: reason || null },
    });
    res.json({ ok: true });
  });

  app.delete("/api/blacklist/:discordId", requireAuth, async (req, res) => {
    await prisma.blacklist.delete({ where: { discordId: req.params.discordId } }).catch(() => {});
    res.json({ ok: true });
  });

  // ---- Messages privés (DM) ----
  app.get("/api/dm/contacts", requireAuth, async (_req, res) => {
    const { listContacts } = require("./lib/dm");
    res.json(await listContacts());
  });

  app.get("/api/dm/contacts/:userId/messages", requireAuth, async (req, res) => {
    const { thread, markRead } = require("./lib/dm");
    const data = await thread(req.params.userId);
    if (!data) return res.json({ contact: null, messages: [] });
    await markRead(req.params.userId).catch(() => {});
    res.json(data);
  });

  // Envoyer un MP (nouveau ou réponse) + enregistré
  app.post("/api/dm", requireAuth, async (req, res) => {
    const { userId, content } = req.body;
    if (!userId || !content) return res.status(400).json({ error: "userId, content requis" });
    const { recordOutgoing } = require("./lib/dm");
    try {
      await recordOutgoing(client, userId, content, { id: req.user.id, username: req.user.username });
      await botLog("info", `${req.user.username} a envoyé un MP à ${userId}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: `Envoi échoué : ${err.message}` });
    }
  });

  // Liste des membres du serveur (pour choisir le destinataire d'un MP)
  app.get("/api/members", requireAuth, async (req, res) => {
    const guild = client?.guilds?.cache.get(GUILD_ID);
    if (!guild) return res.json([]);
    const q = String(req.query.search || "").toLowerCase();
    const members = await guild.members.fetch().catch(() => new Map());
    const out = [];
    for (const [, m] of members) {
      if (m.user.bot) continue;
      const name = m.user.username.toLowerCase();
      if (q && !name.includes(q) && !m.user.id.includes(q)) continue;
      out.push({ id: m.user.id, username: m.user.username, display: m.displayName || m.user.username, avatar: m.user.displayAvatarURL() });
      if (out.length >= 30) break;
    }
    res.json(out);
  });

  return app;
}

module.exports = { createDashboard };
