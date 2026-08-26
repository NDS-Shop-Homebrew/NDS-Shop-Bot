import fs from "fs";
import path from "node:path";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
  REST,
  Routes,
  ChannelType,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type Client as ClientType,
} from "discord.js";
import "dotenv/config";
import { GUILD_ID, ROLE_GAME_UPDATES, CHANNELS, POLL_INTERVAL_MS, API_BASE_URL } from "./config.ts";
import { listGames } from "./lib/api.ts";
import { botLog } from "./lib/botLog.ts";
import { canUse, loadMatrix } from "./lib/permissions.ts";
import { sendTicketMenu, createTicket, relayMessage, closeTicket } from "./lib/tickets.ts";
import { buildEmbed, DEFAULT_TEMPLATE } from "./lib/gameInfo.ts";
import { handleThreadCreate, handleThreadUpdate, handleThreadDelete, notifyAddedGames } from "./lib/gameRequests.ts";
import { getConfig as getLevelingConfig, grantXp } from "./lib/leveling.ts";
import { recordIncoming } from "./lib/dm.ts";
import prisma from "./lib/db.ts";

interface Command {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
  autocomplete?: (interaction: AutocompleteInteraction, games: Game[]) => Promise<void> | void;
}

interface Game {
  fileName: string;
  title: string;
  author?: string;
  version?: string;
  systems?: string[];
  titleId?: string;
  updated?: string;
  icon?: string;
  stars?: string;
  downloads?: Record<string, { url: string }>;
  screenshots?: { description?: string; url?: string }[];
  qr?: Record<string, string>;
  boxart?: string | null;
}

const commands = new Map<string, Command>();

async function loadCommands() {
  const dir = path.join(import.meta.dirname, "commands");
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
    const mod = (await import(`./commands/${file}`)) as { default: Command };
    commands.set(mod.default.data.name, mod.default);
  }
}

let gamesCache: Game[] = [];

export async function refreshGamesCache() {
  try {
    gamesCache = await listGames();
  } catch {}
}

async function registerSlashCommands(client: ClientType) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN || "");
  const body = [...commands.values()].map((c) => c.data.toJSON());
  await rest.put(Routes.applicationGuildCommands(client.user!.id, GUILD_ID), { body });
  await botLog("info", `${body.length} slash commands enregistrées`);
}

async function updateGameInfo(client: ClientType, force = false, ping = false) {
  const guild = client.guilds.cache.get(GUILD_ID);
  const channel = guild?.channels.cache.get(CHANNELS.gameInfo) as import("discord.js").TextChannel | undefined;
  if (!channel || gamesCache.length === 0) return;

  let count = 5;
  try {
    const countRow = await prisma.botSetting.findUnique({ where: { key: "gameInfoCount" } });
    const v = countRow && Number(countRow.value);
    if (v && v > 0) count = v;
  } catch {}

  const latest = [...gamesCache].sort((a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime()).slice(0, count);
  if (!latest.length) return;

  const tplRow = await prisma.botSetting.findUnique({ where: { key: "gameInfoTemplate" } });
  const template = tplRow?.value || DEFAULT_TEMPLATE;

  const links = (g: Game) => {
    const dl = (g.downloads && Object.values(g.downloads)[0]?.url) || `${API_BASE_URL}/games/${encodeURIComponent(g.fileName || "")}`;
    return `[Download](${dl}) · [Info](${API_BASE_URL}/game/${g.fileName || ""})`;
  };

  const [hero, ...rest] = latest;
  const embeds: EmbedBuilder[] = [buildEmbed(template, hero, "#0099ff").setFooter({ text: "Latest additions to the catalogue" })];

  if (rest.length) {
    const list = new EmbedBuilder().setColor("#0099ff").setTitle("Latest additions");
    for (let i = 0; i < Math.min(rest.length, 12); i += 2) {
      const g1 = rest[i];
      const g2 = rest[i + 1];
      list.addFields(
        { name: (g1.title || "—").slice(0, 80), value: links(g1), inline: true },
        { name: g2 ? (g2.title || "—").slice(0, 80) : "\u200b", value: g2 ? links(g2) : "\u200b", inline: true },
        { name: "\u200b", value: "\u200b", inline: false }
      );
    }
    embeds.push(list);
  }

  const role = guild?.roles.cache.find((r) => r.name.toLowerCase() === ROLE_GAME_UPDATES.toLowerCase());
  if (ping && !role) {
    await botLog("warn", `#game-info : rôle "${ROLE_GAME_UPDATES}" introuvable dans le cache du serveur — ping non envoyé`);
  }

  const payload = {
    ...(role ? { content: `||<@&${role.id}>||` } : {}),
    embeds,
  };
  const hash = JSON.stringify(payload);

  try {
    const hashRow = await prisma.botSetting.findUnique({ where: { key: "gameInfoHash" } });
    if (!force && hashRow?.value === hash) return;
  } catch {}

  try {
    const msgRow = await prisma.botSetting.findUnique({ where: { key: "gameInfoMessageId" } });
    const msgId = msgRow?.value;
    const cached = msgId ? channel.messages.cache.get(msgId) : null;
    const msg = cached || (msgId ? await channel.messages.fetch(msgId).catch(() => null) : null);
    if (msg && !ping) {
      await msg.edit(payload);
    } else {
      if (msg) await msg.delete().catch(() => {});
      const sent = await channel.send(payload);
      await prisma.botSetting.upsert({
        where: { key: "gameInfoMessageId" },
        update: { value: sent.id },
        create: { key: "gameInfoMessageId", value: sent.id },
      });
    }
    await prisma.botSetting.upsert({
      where: { key: "gameInfoHash" },
      update: { value: hash },
      create: { key: "gameInfoHash", value: hash },
    });
  } catch (err) {
    await botLog("error", `#game-info : ${(err as Error).message}`);
  }
}

async function ensureChannels(client: ClientType) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  const desired = [
    { name: "welcome", parent: "📢 INFORMATION", topic: "Welcome! Introduce yourself and say hi." },
  ];
  for (const d of desired) {
    const exists = guild.channels.cache.some((c) => c.name === d.name && c.type === ChannelType.GuildText);
    if (exists) continue;
    const parent = guild.channels.cache.find((c) => c.name === d.parent && c.type === ChannelType.GuildCategory);
    await guild.channels.create({
      name: d.name,
      type: ChannelType.GuildText,
      parent: parent?.id,
      topic: d.topic,
    }).then((c) => botLog("info", `Salon #${d.name} créé`)).catch((err) => botLog("error", `Salon #${d.name} : ${(err as Error).message}`));
  }
}

export async function pollNewGames(client: ClientType) {
  await refreshGamesCache();
  try {
    const knownRow = await prisma.botSetting.findUnique({ where: { key: "knownGames" } });
    const known = knownRow?.value ? JSON.parse(knownRow.value) : null;

    if (!known) {
      await prisma.botSetting.upsert({
        where: { key: "knownGames" },
        update: { value: JSON.stringify(Object.fromEntries(gamesCache.map((g) => [g.fileName, 1]))) },
        create: { key: "knownGames", value: JSON.stringify(Object.fromEntries(gamesCache.map((g) => [g.fileName, 1]))) },
      });
      await botLog("info", `${gamesCache.length} jeux enregistrés (premier poll)`);
      await updateGameInfo(client);
      return;
    }

    const added = gamesCache.filter((g) => !known[g.fileName]);
    const removed = Object.keys(known).filter((k) => !gamesCache.some((g) => g.fileName === k));

    for (const g of added) {
      await botLog("info", `Nouveau jeu détecté : ${g.title}`);
    }
    if (removed.length) {
      await botLog("warn", `${removed.length} jeu(x) retiré(s) du catalogue`);
    }

    if (added.length) {
      await notifyAddedGames(client, added);
    }

    await prisma.botSetting.upsert({
      where: { key: "knownGames" },
      update: { value: JSON.stringify(Object.fromEntries(gamesCache.map((g) => [g.fileName, 1]))) },
      create: { key: "knownGames", value: JSON.stringify(Object.fromEntries(gamesCache.map((g) => [g.fileName, 1]))) },
    });

    await updateGameInfo(client, false, added.length > 0);
  } catch (err) {
    await botLog("error", `Poll: ${(err as Error).message}`);
  }
}

export async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.Channel],
  });

  await loadCommands();

  client.once("clientReady", async () => {
    await botLog("info", `Connecté en tant que ${client.user!.tag}`);
    await loadMatrix();
    await registerSlashCommands(client);
    await ensureChannels(client);

    let pollMs = POLL_INTERVAL_MS;
    try {
      const row = await prisma.botSetting.findUnique({ where: { key: "pollInterval" } });
      const v = row && Number(row.value);
      if (v && v > 10000) pollMs = v;
    } catch {}
    await botLog("info", `Poll nouveaux jeux : toutes les ${Math.round(pollMs / 60000)} min`);

    await pollNewGames(client);
    setInterval(() => pollNewGames(client), pollMs);

    setInterval(async () => {
      try {
        const due = await prisma.reminder.findMany({ where: { sent: false, dueAt: { lte: new Date() } } });
        for (const r of due) {
          const user = await client.users.fetch(r.discordId).catch(() => null);
          if (user) {
            await user.send(`⏰ **Rappel** : ${r.content}`);
          }
          await prisma.reminder.update({ where: { id: r.id }, data: { sent: true } });
        }
      } catch {}
    }, 60 * 1000);
  });

  client.on("guildMemberAdd", async (member) => {
    if (member.guild.id !== GUILD_ID || member.user.bot) return;
    try {
      const row = await prisma.botSetting.findUnique({ where: { key: "welcomeMessage" } });
      if (!row?.value) return;
      const target = (member.guild.channels.cache.find(
        (c) => c.name === "général" && c.isTextBased()
      ) || member.guild.channels.cache.find(
        (c) => c.name === "general" && c.isTextBased()
      )) as import("discord.js").TextChannel | undefined;
      if (target) {
        await target.send(row.value.replace(/\\{user\\}/g, `<@${member.id}>`));
      }
    } catch {}
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith("ticket_")) {
      const category = interaction.customId.slice(7);
      const catName = category.charAt(0).toUpperCase() + category.slice(1);
      await interaction.deferUpdate().catch(() => {});
      try {
        const existing = await prisma.ticket.findFirst({ where: { userId: interaction.user.id, status: "open" } });
        if (existing) {
          return interaction.user.send("📌 Vous avez déjà un ticket ouvert.");
        }
        const ticket = await createTicket(client, interaction.user, catName);
        if (ticket) {
          await interaction.user.send(`✅ Votre ticket **${catName}** a été ouvert. Écrivez ici, l'équipe vous répondra !`);
        } else {
          await interaction.user.send("❌ Impossible de créer le ticket (catégorie manquante ?).");
        }
      } catch (err) {
        await botLog("error", `Ticket button: ${(err as Error).message}`);
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd?.autocomplete) {
        try {
          await cmd.autocomplete(interaction, gamesCache);
        } catch {}
      }
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      const bl = await prisma.blacklist.findUnique({ where: { discordId: interaction.user.id } });
      if (bl) {
        return interaction.reply({ content: "🚫 Vous êtes banni de l'utilisation du bot.", ephemeral: true });
      }
    } catch {}

    const allowed = await canUse(interaction.member as import("discord.js").GuildMember | null, interaction.commandName);
    if (!allowed) {
      await botLog("warn", `${interaction.user.tag} a tenté /${interaction.commandName} sans permission`);
      return interaction.reply({ content: "⛔ Vous n'avez pas la permission d'utiliser cette commande.", ephemeral: true });
    }

    try {
      const opts = interaction.options.data
        .map((o) => `${o.name}=${typeof o.value === "string" ? o.value.slice(0, 50) : o.value}`)
        .join(" ");
      await prisma.botCommandLog.create({
        data: { userId: interaction.user.id, username: interaction.user.username, command: interaction.commandName, options: opts || null },
      });
    } catch {}

    try {
      await cmd.execute(interaction);
    } catch (err) {
      await botLog("error", `/${interaction.commandName}: ${(err as Error).message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
      }
    }
  });

  client.on("threadCreate", (thread) => handleThreadCreate(client, thread));
  client.on("threadUpdate", (oldThread, newThread) => handleThreadUpdate(client, oldThread, newThread));
  client.on("threadDelete", (thread) => handleThreadDelete(client, thread));

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.isDMBased()) {
      if (message.content?.trim()) {
        await recordIncoming(message.author, message.content).catch(() => {});
        const handled = await relayMessage(client, message.channel, message.author, message.content, true);
        if (!handled) {
          try {
            await sendTicketMenu(message.author);
          } catch {}
        }
      }
      return;
    }
    const ticket = await prisma.ticket.findFirst({ where: { threadId: message.channel.id, status: "open" } });
    if (ticket && message.content?.trim()) {
      await relayMessage(client, message.channel, message.author, message.content, false);
      return;
    }

    try {
      const cfg = await getLevelingConfig();
      if (cfg.enabled && !message.channel.isDMBased()) {
        if (!cfg.excludedChannels?.includes(message.channel.name)) {
          const result = await grantXp(message.author.id, message.guild);
          if (result) {
            await message.channel.send(`🎉 <@${message.author.id}> est passé **niveau ${result.newLevel}** !`).catch(() => {});
          }
        }
      }
    } catch {}
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

export const getGamesCache = () => gamesCache;
