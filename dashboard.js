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
  app.use(express.static(path.join(__dirname, "public")));

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
    const guild = client.guilds.cache.get(GUILD_ID);
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
      res.json(games.slice(0, 50));
    } catch {
      res.json([]);
    }
  });

  // ---- Salons textuels ----
  app.get("/api/channels", requireAuth, (req, res) => {
    const guild = client.guilds.cache.get(GUILD_ID);
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

    const guild = client.guilds.cache.get(GUILD_ID);
    const channel = guild?.channels.cache.find((c) => c.name === item.channel && c.isTextBased());
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
    const guild = client.guilds.cache.get(GUILD_ID);
    const channel = guild?.channels.cache.get(channelId);
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
    const { pollNewGames } = require("./index");
    // Re-expose via client property set by server.js
    if (typeof client.pollNow === "function") {
      await client.pollNow();
      res.json({ ok: true });
    } else {
      res.status(400).json({ error: "Poll non disponible" });
    }
  });

  return app;
}

module.exports = { createDashboard };
