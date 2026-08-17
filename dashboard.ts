import fs from "fs";
import path from "node:path";
import express, { type Request, type Response, type NextFunction } from "express";
import { ChannelType, type Client, type Guild, type GuildChannel, type NonThreadGuildBasedChannel, type TextBasedChannel } from "discord.js";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth.ts";
import prisma from "./lib/db.ts";
import { botLog } from "./lib/botLog.ts";
import { listGames } from "./lib/api.ts";
import { GUILD_ID, CHANNELS } from "./config.ts";
import { resolveMentions, getGuildMembers } from "./lib/mentions.ts";
import { getGamesCache } from "./index.ts";
import { setRequestStatus } from "./lib/gameRequests.ts";
import { closeTicket } from "./lib/tickets.ts";
import { listContacts, thread as getThread, markRead, recordOutgoing } from "./lib/dm.ts";
import { getMatrix, reloadMatrix, saveMatrix, ROLE_ORDER } from "./lib/permissions.ts";

const param = (req: Request, name: string) => String(req.params[name]);

interface AuthUser {
  id: string;
  username: string;
  role: string;
}

type AuthRequest = Request & { user?: AuthUser };

function createDashboard(client: Client | null) {
  const app = express();
  app.use(express.json());
  const dist = path.join(import.meta.dirname, "frontend", "dist");
  app.use(express.static(dist));
  app.get("/", (_req, res) => res.sendFile(path.join(dist, "index.html")));

  app.all("/api/auth/{*path}", toNodeHandler(auth));

  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: "Non connecté" });
    (req as AuthRequest).user = session.user as AuthUser;
    next();
  }

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: "Non connecté" });
    if ((session.user as AuthUser).role !== "admin") {
      return res.status(403).json({ error: "Accès réservé aux administrateurs" });
    }
    (req as AuthRequest).user = session.user as AuthUser;
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

  app.get("/api/session", async (req, res) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    res.json({ user: session?.user || null });
  });

  app.get("/api/status", requireAuth, async (req, res) => {
    const guild = guildInfo();
    const games = getGamesCache().length;
    res.json({
      bot: { online: client?.isReady() || false, username: client?.user?.tag || null, uptime: client?.uptime || 0 },
      guild,
      games,
      user: (req as AuthRequest).user,
    });
  });

  app.get("/api/games", requireAuth, async (req, res) => {
    try {
      let games = await listGames();
      const q = String(req.query.search || "").toLowerCase();
      if (q) {
        games = games.filter(
          (g: { title: string; author?: string }) => g.title.toLowerCase().includes(q) || (g.author || "").toLowerCase().includes(q)
        );
      }
      res.json(games.slice(0, 200));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/channels", requireAuth, async (req, res) => {
    const guild = client?.guilds?.cache.get(GUILD_ID);
    if (!guild) return res.json([]);
    const all = (await guild.channels.fetch()).filter((ch): ch is NonThreadGuildBasedChannel => !!ch);
    const roleName = (id: string) => {
      if (id === guild.roles.everyone.id) return "@everyone";
      return guild.roles.cache.get(id)?.name || "";
    };
    const permsOf = (c: GuildChannel) =>
      c.permissionOverwrites.cache.map((o) => ({
        role: roleName(o.id),
        allow: o.allow.toArray(),
        deny: o.deny.toArray(),
      })).filter((p) => p.allow.length || p.deny.length);
    const textOf = (ch: GuildChannel) => ({ id: ch.id, name: ch.name, perms: permsOf(ch) });
    const cats: { id: string; name: string; perms: unknown[]; channels: unknown[] }[] = [];
    for (const c of all.filter((ch) => ch.type === ChannelType.GuildCategory).values()) {
      cats.push({
        id: c.id,
        name: c.name,
        perms: permsOf(c),
        channels: all.filter((ch) => ch.parentId === c.id && ch.isTextBased()).map(textOf),
      });
    }
    const orphans = all.filter((ch) => !ch.parentId && ch.isTextBased());
    if (orphans.size) {
      cats.push({ id: "no-category", name: "Hors catégorie", perms: [], channels: orphans.map(textOf) });
    }
    res.json(cats);
  });

  app.post("/api/channels/sync", requireAdmin, async (_req, res) => {
    const guild = client?.guilds?.cache.get(GUILD_ID);
    if (!guild) return res.status(400).json({ error: "Bot hors ligne" });
    let synced = 0;
    for (const cat of guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).values()) {
      for (const ch of guild.channels.cache.filter((c) => c.parentId === cat.id).values()) {
        if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildVoice) continue;
        try {
          await ch.lockPermissions();
          synced++;
        } catch {}
      }
    }
    res.json({ ok: true, synced });
  });

  app.get("/api/announcements", requireAuth, async (_req, res) => {
    const items = await prisma.botAnnouncement.findMany({ orderBy: { createdAt: "desc" } });
    res.json(items);
  });

  app.post("/api/announcements", requireAdmin, async (req, res) => {
    const { title, content, channel } = req.body;
    if (!title || !content || !channel) {
      return res.status(400).json({ error: "title, content, channel requis" });
    }
    const item = await prisma.botAnnouncement.create({
      data: { title, content, channel, status: "draft", sentBy: (req as AuthRequest).user?.username },
    });
    await botLog("info", `Annonce créée : ${title}`);
    res.json(item);
  });

  app.put("/api/announcements/:id", requireAdmin, async (req, res) => {
    const { title, content, channel } = req.body;
    const item = await prisma.botAnnouncement.update({
where: { id: param(req, "id") },
      data: { title, content, channel },
    });
    res.json(item);
  });

  app.delete("/api/announcements/:id", requireAdmin, async (req, res) => {
    await prisma.botAnnouncement.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  });

  app.post("/api/announcements/:id/send", requireAdmin, async (req, res) => {
    const item = await prisma.botAnnouncement.findUnique({ where: { id: param(req, "id") } });
    if (!item) return res.status(404).json({ error: "Annonce introuvable" });

    const guild = client?.guilds?.cache.get(GUILD_ID);
    const channel = guild?.channels?.cache.find((c) => c.name === item.channel && c.isTextBased()) as import("discord.js").TextChannel | undefined;
    if (!channel) {
      return res.status(400).json({ error: `Salon #${item.channel} introuvable` });
    }
    try {
      await channel.send({ content: await resolveMentions(client, item.content) });
    } catch (err) {
      return res.status(500).json({ error: `Envoi échoué : ${(err as Error).message}` });
    }
    await prisma.botAnnouncement.update({
      where: { id: item.id },
      data: { status: "sent", sentAt: new Date(), sentBy: (req as AuthRequest).user?.username },
    });
    await botLog("info", `Annonce envoyée : ${item.title} -> #${item.channel}`);
    res.json({ ok: true });
  });

  app.post("/api/send", requireAdmin, async (req, res) => {
    const { channelId, content } = req.body;
    if (!channelId || !content) return res.status(400).json({ error: "channelId, content requis" });
    const guild = client?.guilds?.cache.get(GUILD_ID);
    const channel = guild?.channels?.cache.get(channelId);
    if (!channel?.isTextBased()) return res.status(400).json({ error: "Salon invalide" });
    try {
      const resolved = await resolveMentions(client, content);
      await channel.send({ content: resolved });
      await botLog("info", `Message envoyé par ${(req as AuthRequest).user?.username} -> #${channel.name}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/logs", requireAuth, async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await prisma.botLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    res.json(logs);
  });

  app.get("/api/settings", requireAuth, async (_req, res) => {
    const rows = await prisma.botSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  });

  app.put("/api/settings/:key", requireAdmin, async (req, res) => {
    const key = param(req, "key");
    const value = String(req.body.value ?? "");
    await prisma.botSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ ok: true });
  });

  app.post("/api/poll", requireAdmin, async (_req, res) => {
    try {
      if (typeof client?.pollNow === "function") {
        await client.pollNow();
        res.json({ ok: true });
      } else {
        res.status(400).json({ error: "Bot hors ligne — poll indisponible" });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/tickets", requireAuth, async (req, res) => {
    const status = req.query.status || "all";
    const where = status === "all" ? {} : { status: String(status) };
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    res.json(tickets);
  });

  app.post("/api/tickets/:id/reply", requireAdmin, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "content requis" });
    const ticket = await prisma.ticket.findUnique({ where: { id: param(req, "id") } });
    if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
    const user = (req as AuthRequest).user!;
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, author: user.username, content, direction: "staff" },
    });
    const member = await client?.users?.fetch(ticket.userId).catch(() => null);
    if (member) await member.send(`**${user.username}** : ${content}`);
    await botLog("info", `Réponse staff au ticket ${ticket.id}`);
    res.json({ ok: true });
  });

  app.post("/api/tickets/:id/close", requireAdmin, async (req, res) => {
    await closeTicket(client, param(req, "id"), (req as AuthRequest).user?.username);
    res.json({ ok: true });
  });

  app.post("/api/tickets/:id/reopen", requireAdmin, async (req, res) => {
    await prisma.ticket.update({ where: { id: param(req, "id") }, data: { status: "open", closedAt: null } });
    res.json({ ok: true });
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    const search = String(req.query.search || "").toLowerCase();
    const limit = Math.min(Number(req.query.limit || 100), 200);
    const profiles = await prisma.userProfile.findMany({ orderBy: { xp: "desc" }, take: limit });
    const members = await getGuildMembers(client);
    const out: { discordId: string; username: string; xp: number; level: number; totalMsgs: number; favorites: string[] }[] = [];
    for (const p of profiles) {
      const member = members?.get(p.discordId);
      const username = member?.user?.username || p.discordId;
      if (search && !p.discordId.includes(search) && !username.toLowerCase().includes(search)) continue;
      out.push({
        discordId: p.discordId,
        username,
        xp: Number(p.xp),
        level: p.level,
        totalMsgs: p.totalMsgs,
        favorites: p.favorites ? JSON.parse(p.favorites) : [],
      });
    }
    res.json(out);
  });

  app.get("/api/leveling", requireAuth, async (_req, res) => {
    const row = await prisma.botSetting.findUnique({ where: { key: "levelingConfig" } });
    res.json(row?.value ? JSON.parse(row.value) : { enabled: true, xpPerMessage: 15, excludedChannels: [], roles: [] });
  });

  app.put("/api/leveling", requireAdmin, async (req, res) => {
    await prisma.botSetting.upsert({
      where: { key: "levelingConfig" },
      update: { value: JSON.stringify(req.body) },
      create: { key: "levelingConfig", value: JSON.stringify(req.body) },
    });
    res.json({ ok: true });
  });

  app.get("/api/permissions", requireAuth, async (_req, res) => {
    const cmds = fs.readdirSync(path.join(import.meta.dirname, "commands")).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""));
    res.json({ matrix: await getMatrix(), roles: ROLE_ORDER, commands: cmds });
  });

  app.put("/api/permissions", requireAdmin, async (req, res) => {
    await saveMatrix(req.body.matrix || {});
    res.json({ ok: true });
  });

  app.get("/api/commands", requireAuth, async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const q = String(req.query.search || "").toLowerCase();
    const cmd = String(req.query.command || "");
    const where = {
      ...(cmd ? { command: cmd } : {}),
      ...(q ? { OR: [{ username: { contains: q } }, { userId: { contains: q } }] } : {}),
    };
    const logs = await prisma.botCommandLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
    res.json(logs);
  });

  app.get("/api/blacklist", requireAuth, async (_req, res) => {
    res.json(await prisma.blacklist.findMany({ orderBy: { createdAt: "desc" } }));
  });

  app.post("/api/blacklist", requireAdmin, async (req, res) => {
    const { discordId, reason } = req.body;
    if (!discordId) return res.status(400).json({ error: "discordId requis" });
    await prisma.blacklist.upsert({
      where: { discordId },
      update: { reason: reason || null },
      create: { discordId, reason: reason || null },
    });
    res.json({ ok: true });
  });

  app.delete("/api/blacklist/:discordId", requireAdmin, async (req, res) => {
    await prisma.blacklist.delete({ where: { discordId: param(req, "discordId") } }).catch(() => {});
    res.json({ ok: true });
  });

  app.post("/api/warn", requireAdmin, async (req, res) => {
    const { discordId, reason, days } = req.body;
    if (!discordId) return res.status(400).json({ error: "discordId requis" });
    const expiresAt = Number(days) > 0 ? new Date(Date.now() + Number(days) * 86400000) : null;
    const user = (req as AuthRequest).user!;
    await prisma.warn.create({
      data: { discordId, modId: user.id, reason: reason || "Avertissement dashboard", expiresAt },
    });
    await botLog("warn", `${user.username} a warn ${discordId}: ${reason}${expiresAt ? ` (${days}j)` : ""}`);
    let action: string | null = null;
    let activeWarns = 0;
    try {
      const cfg = await prisma.botSetting.findUnique({ where: { key: "warnConfig" } });
      const wc = cfg?.value ? JSON.parse(cfg.value) : { max: 3, action: "kick" };
      activeWarns = await prisma.warn.count({ where: { discordId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
      if (wc.max > 0 && activeWarns >= wc.max) action = wc.action;
    } catch {}
    res.json({ ok: true, activeWarns, action });
  });

  app.post("/api/reload", requireAdmin, async (_req, res) => {
    await reloadMatrix();
    res.json({ ok: true });
  });

  app.get("/api/dm/contacts", requireAuth, async (_req, res) => {
    res.json(await listContacts());
  });

  app.get("/api/dm/contacts/:userId/messages", requireAuth, async (req, res) => {
    const data = await getThread(param(req, "userId"));
    if (!data) return res.json({ contact: null, messages: [] });
    await markRead(param(req, "userId")).catch(() => {});
    res.json(data);
  });

  app.post("/api/dm", requireAdmin, async (req, res) => {
    const { userId, content } = req.body;
    if (!userId || !content) return res.status(400).json({ error: "userId, content requis" });
    const user = (req as AuthRequest).user!;
    try {
      const resolved = await resolveMentions(client, content);
      await recordOutgoing(client, userId, resolved, { id: user.id, username: user.username });
      await botLog("info", `${user.username} a envoyé un MP à ${userId}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: `Envoi échoué : ${(err as Error).message}` });
    }
  });

  app.delete("/api/dm/:userId", requireAdmin, async (req, res) => {
    try {
      const contact = await prisma.botDmContact.findUnique({ where: { discordId: param(req, "userId") } });
      if (contact) await prisma.botDmContact.delete({ where: { id: contact.id } });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/dm/messages/:messageId", requireAdmin, async (req, res) => {
    try {
      await prisma.botDmMessage.delete({ where: { id: param(req, "messageId") } }).catch(() => {});
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/warns", requireAuth, async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const warns = await prisma.warn.findMany({ where: { discordId: String(userId) }, orderBy: { createdAt: "desc" } });
    res.json(warns);
  });

  app.get("/api/tickets/all", requireAuth, async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);
    const tickets = await prisma.ticket.findMany({ where: { userId: String(userId) }, orderBy: { createdAt: "desc" } });
    res.json(tickets);
  });

  app.get("/api/members", requireAuth, async (req, res) => {
    const q = String(req.query.search || "").toLowerCase();
    const members = await getGuildMembers(client);
    const out: { id: string; username: string; display: string; avatar: string }[] = [];
    for (const [, m] of members) {
      if (m.user.bot) continue;
      const name = (m.user.username + " " + (m.displayName || "")).toLowerCase();
      if (q && !name.includes(q) && !m.user.id.includes(q)) continue;
      out.push({ id: m.user.id, username: m.user.username, display: m.displayName || m.user.username, avatar: m.user.displayAvatarURL() });
      if (out.length >= 200) break;
    }
    out.sort((a, b) => a.display.localeCompare(b.display));
    res.json(out);
  });

  app.get("/api/tickets/stats", requireAuth, async (_req, res) => {
    const [open, closed] = await Promise.all([
      prisma.ticket.count({ where: { status: "open" } }),
      prisma.ticket.count({ where: { status: "closed" } }),
    ]);
    const byCat = await prisma.ticket.groupBy({ by: ["category"], _count: { _all: true } });
    res.json({ open, closed, total: open + closed, byCategory: byCat });
  });

  app.get("/api/ticket-templates", requireAuth, async (_req, res) => {
    const row = await prisma.botSetting.findUnique({ where: { key: "ticketTemplates" } });
    res.json(row?.value ? JSON.parse(row.value) : []);
  });

  app.put("/api/ticket-templates", requireAdmin, async (req, res) => {
    const templates = Array.isArray(req.body.templates) ? req.body.templates.filter((t: unknown) => typeof t === "string" && (t as string).trim()) : [];
    await prisma.botSetting.upsert({
      where: { key: "ticketTemplates" },
      update: { value: JSON.stringify(templates) },
      create: { key: "ticketTemplates", value: JSON.stringify(templates) },
    });
    res.json({ ok: true, templates });
  });

  app.get("/api/warn-config", requireAuth, async (_req, res) => {
    const row = await prisma.botSetting.findUnique({ where: { key: "warnConfig" } });
    res.json(row?.value ? JSON.parse(row.value) : { max: 3, action: "kick" });
  });

  app.put("/api/warn-config", requireAdmin, async (req, res) => {
    const v = { max: Math.max(0, Number(req.body.max) || 0), action: req.body.action === "ban" ? "ban" : "kick" };
    await prisma.botSetting.upsert({
      where: { key: "warnConfig" },
      update: { value: JSON.stringify(v) },
      create: { key: "warnConfig", value: JSON.stringify(v) },
    });
    res.json({ ok: true, config: v });
  });

  app.get("/api/requests", requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      const where = status ? { status: String(status) } : {};
      const rows = await prisma.gameRequest.findMany({ where, orderBy: { createdAt: "desc" } });

      const forum = client?.guilds?.cache.get(GUILD_ID)?.channels.cache.find((c) => c.name === CHANNELS.gameRequests);
      const forumId = forum?.id || null;

      const users = new Map<string, string>();
      for (const r of rows) {
        if (!users.has(r.discordId)) {
          const u = await client?.users.fetch(r.discordId).catch(() => null);
          users.set(r.discordId, u ? `${u.displayName} (@${u.username})` : r.discordId);
        }
      }

      res.json({
        guildId: GUILD_ID,
        forumId,
        requests: rows.map((r) => ({
          threadId: r.threadId,
          title: r.title,
          status: r.status,
          discordId: r.discordId,
          username: users.get(r.discordId),
          createdAt: r.createdAt,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put("/api/requests/:threadId/status", requireAdmin, async (req, res) => {
    try {
      const threadId = param(req, "threadId");
      const { status } = req.body || {};
      await setRequestStatus(client, threadId, status);
      res.json({ ok: true, status });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/requests/:threadId", requireAdmin, async (req, res) => {
    try {
      const threadId = param(req, "threadId");
      const ch = await client?.channels.fetch(threadId).catch(() => null);
      await (ch as import("discord.js").GuildChannel | null)?.delete().catch(() => {});
      await prisma.gameRequest.deleteMany({ where: { threadId } });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get("/api/settings/export", requireAdmin, async (_req, res) => {
    const rows = await prisma.botSetting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  });

  app.post("/api/settings/import", requireAdmin, async (req, res) => {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    let n = 0;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== "string") continue;
      await prisma.botSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
      n++;
    }
    await botLog("info", `Import réglages : ${n} clés restaurées`);
    res.json({ ok: true, imported: n });
  });

  return app;
}

export { createDashboard };
