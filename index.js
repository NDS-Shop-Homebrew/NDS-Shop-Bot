// NDS-Shop Bot — module exportable. server.js démarre bot + dashboard ensemble.
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
  REST,
  Routes,
} = require("discord.js");
require("dotenv").config();

const { GUILD_ID, ROLE_MENU, ROLE_CHANNEL, ROLE_MEMBRE, ROLE_MENU_MESSAGE_ID, CHANNELS, POLL_INTERVAL_MS } = require("./config");
const { listGames } = require("./lib/api");
const { T } = require("./lib/lang");
const { botLog } = require("./lib/botLog");
const { canUse, loadMatrix } = require("./lib/permissions");
const { sendTicketMenu, createTicket, relayMessage, closeTicket } = require("./lib/tickets");
const prisma = require("./lib/db");

// ---- Chargement des commandes slash ----
const commands = new Map();
for (const file of fs.readdirSync(path.join(__dirname, "commands"))) {
  if (!file.endsWith(".js")) continue;
  const cmd = require(path.join(__dirname, "commands", file));
  commands.set(cmd.data.name, cmd);
}

let gamesCache = [];

async function refreshGamesCache() {
  try {
    gamesCache = await listGames();
  } catch {}
}

async function registerSlashCommands(client) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const body = [...commands.values()].map((c) => c.data.toJSON());
  await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body });
  await botLog("info", `${body.length} slash commands enregistrées`);
}

async function postRoleMenu(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  const channel = guild.channels.cache.find((c) => c.name === ROLE_CHANNEL && c.isTextBased());
  if (!channel) return;

  const menuEmbed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("Choix de langue / Language selection")
    .setDescription(
      "Réagissez avec votre langue pour accéder aux salons. Vous aurez automatiquement le rôle **Membre**.\n\n" +
        "React with your language to unlock the channels. You will automatically get the **Membre** role.\n\n" +
        Object.entries(ROLE_MENU)
          .map(([emoji, role]) => `${emoji} → ${role}`)
          .join("\n") +
        "\n\n_Retirez votre réaction pour changer de langue / Remove your reaction to switch._"
    );

  // Cherche en base l'ID sauvegardé
  let savedId = ROLE_MENU_MESSAGE_ID;
  if (!savedId) {
    try {
      const row = await prisma.botSetting.findUnique({ where: { key: "roleMenuMessageId" } });
      if (row?.value) savedId = row.value;
    } catch {}
  }

  // Réutilise le message existant
  let message;
  if (savedId) {
    try {
      message = await channel.messages.fetch(savedId);
    } catch {}
  }

  // Cherche un message du bot avec le même titre dans le salon (fallback)
  if (!message) {
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMsg = messages.find((m) => m.author.id === client.user.id && m.embeds?.[0]?.title === "Choix de langue / Language selection");
    if (botMsg) {
      message = botMsg;
      savedId = message.id;
    }
  }

  // Supprime les doublons (tous les autres messages du bot avec ce titre dans le salon)
  const allMsgs = await channel.messages.fetch({ limit: 50 });
  const dupes = allMsgs.filter((m) => m.id !== message?.id && m.author.id === client.user.id && m.embeds?.[0]?.title === "Choix de langue / Language selection");
  for (const d of dupes.values()) {
    try { await d.delete(); } catch {}
  }

  if (!message) {
    message = await channel.send({ embeds: [menuEmbed] });
    savedId = message.id;
    await botLog("info", `Menu posté dans #${channel.name} (id: ${savedId})`);
  }

  // Sauvegarde l'ID en base
  try {
    if (savedId) {
      await prisma.botSetting.upsert({
        where: { key: "roleMenuMessageId" },
        update: { value: savedId },
        create: { key: "roleMenuMessageId", value: savedId },
      });
    }
  } catch {}

  for (const emoji of Object.keys(ROLE_MENU)) {
    await message.react(emoji).catch(() => {});
  }
}

// Annonce d'un nouveau jeu dans #annonces-jeux
async function announceGame(client, g) {
  const guild = client.guilds.cache.get(GUILD_ID);
  const channel = guild?.channels.cache.find((c) => c.name === CHANNELS.annoncesJeux && c.isTextBased());
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`${T.fr.newGamesTitle} : ${g.title}`)
    .setURL(`https://db-nds-shop.fr/game/${g.fileName}`)
    .setThumbnail(g.icon || null)
    .addFields(
      { name: "Auteur", value: g.author || "N/A", inline: true },
      { name: "Version", value: g.version || "N/A", inline: true },
      { name: "Systèmes", value: (g.systems || []).join(", ") || "N/A", inline: true }
    );
  if (channel) await channel.send({ embeds: [embed] });
}

// Poll : détecte les nouveaux jeux et les annonce (état stocké en base BotSetting)
async function pollNewGames(client) {
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
      return;
    }

    const added = gamesCache.filter((g) => !known[g.fileName]);
    const removed = Object.keys(known).filter((k) => !gamesCache.some((g) => g.fileName === k));

    for (const g of added) {
      await announceGame(client, g);
      await botLog("info", `Nouveau jeu annoncé : ${g.title}`);
    }
    if (removed.length) {
      await botLog("warn", `${removed.length} jeu(x) retiré(s) du catalogue`);
    }

    await prisma.botSetting.upsert({
      where: { key: "knownGames" },
      update: { value: JSON.stringify(Object.fromEntries(gamesCache.map((g) => [g.fileName, 1]))) },
      create: { key: "knownGames", value: JSON.stringify(Object.fromEntries(gamesCache.map((g) => [g.fileName, 1]))) },
    });
  } catch (err) {
    await botLog("error", `Poll: ${err.message}`);
  }
}

// --- Réaction du menu de rôles ---
async function handleReaction(client, reaction, user, adding) {
  if (user.bot) return;
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  const channel = reaction.message.channel;
  if (channel.name !== ROLE_CHANNEL) return;
  if (ROLE_MENU_MESSAGE_ID && reaction.message.id !== ROLE_MENU_MESSAGE_ID) return;

  const roleName = ROLE_MENU[reaction.emoji.name];
  if (!roleName) {
    await reaction.remove().catch(() => {});
    return;
  }
  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.find((r) => r.name === roleName);
  const membreRole = guild.roles.cache.find((r) => r.name === ROLE_MEMBRE);
  if (!role || !membreRole) return;

  try {
    if (adding) {
      await member.roles.add([membreRole, role]);
      for (const [emoji, otherName] of Object.entries(ROLE_MENU)) {
        if (otherName === roleName) continue;
        const otherRole = guild.roles.cache.find((r) => r.name === otherName);
        if (otherRole) await member.roles.remove(otherRole).catch(() => {});
      }
    } else {
      await member.roles.remove([membreRole, role]);
    }
  } catch (err) {
    await botLog("error", `Assignation rôle: ${err.message}`);
  }
}

// Démarre le bot et retourne le client
async function startBot() {
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

  client.once("clientReady", async () => {
    await botLog("info", `Connecté en tant que ${client.user.tag}`);
    await loadMatrix();
    await registerSlashCommands(client);
    await postRoleMenu(client);

    // Intervalle de poll configurable depuis le dashboard (BotSetting)
    let pollMs = POLL_INTERVAL_MS;
    try {
      const row = await prisma.botSetting.findUnique({ where: { key: "pollInterval" } });
      const v = row && Number(row.value);
      if (v && v > 10000) pollMs = v;
    } catch {}
    await botLog("info", `Poll nouveaux jeux : toutes les ${Math.round(pollMs / 60000)} min`);

    await pollNewGames(client);
    setInterval(() => pollNewGames(client), pollMs);

    // Rappels MP dus
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

  // Message de bienvenue (configurable via dashboard BotSetting welcomeMessage)
  client.on("guildMemberAdd", async (member) => {
    if (member.guild.id !== GUILD_ID || member.user.bot) return;
    try {
      const row = await prisma.botSetting.findUnique({ where: { key: "welcomeMessage" } });
      if (!row?.value) return;
      const target = member.guild.channels.cache.find(
        (c) => c.name === "général" && c.isTextBased()
      ) || member.guild.channels.cache.find(
        (c) => c.name === "general" && c.isTextBased()
      );
      if (target) {
        await target.send(row.value.replace(/\\{user\\}/g, `<@${member.id}>`));
      }
    } catch {}
  });

  client.on("interactionCreate", async (interaction) => {
    // Boutons du menu de tickets (DM)
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
        await botLog("error", `Ticket button: ${err.message}`);
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

    // Blacklist globale
    try {
      const bl = await prisma.blacklist.findUnique({ where: { discordId: interaction.user.id } });
      if (bl) {
        return interaction.reply({ content: "🚫 Vous êtes banni de l'utilisation du bot.", ephemeral: true });
      }
    } catch {}

    // Permission par rôle
    const allowed = await canUse(interaction.member, interaction.commandName);
    if (!allowed) {
      await botLog("warn", `${interaction.user.tag} a tenté /${interaction.commandName} sans permission`);
      return interaction.reply({ content: "⛔ Vous n'avez pas la permission d'utiliser cette commande.", ephemeral: true });
    }

    // Log de la commande
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
      await botLog("error", `/${interaction.commandName}: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
      }
    }
  });

  // Relais DM <-> thread de ticket
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.isDMBased()) {
      // Message du user en DM
      if (message.content?.trim()) {
        // Trace la conversation (qui a contacté le bot)
        const { recordIncoming } = require("./lib/dm");
        await recordIncoming(message.author, message.content).catch(() => {});
        const handled = await relayMessage(client, message.channel, message.author, message.content, true);
        if (!handled) {
          // Aucun ticket ouvert -> propose le menu
          try {
            await sendTicketMenu(message.author);
          } catch {}
        }
      }
      return;
    }
    // Message dans un salon de ticket (thread) -> relais vers le DM du user
    const ticket = await prisma.ticket.findFirst({ where: { threadId: message.channel.id, status: "open" } });
    if (ticket && message.content?.trim()) {
      await relayMessage(client, message.channel, message.author, message.content, false);
      return;
    }

    // Leveling : XP sur les messages dans les salons
    try {
      const lvlCfg = require("./lib/leveling").getConfig;
      const cfg = await lvlCfg();
      if (cfg.enabled && !message.channel.isDMBased()) {
        if (!cfg.excludedChannels?.includes(message.channel.name)) {
          const { grantXp } = require("./lib/leveling");
          const result = await grantXp(message.author.id, message.guild);
          if (result) {
            await message.channel.send(`🎉 <@${message.author.id}> est passé **niveau ${result.newLevel}** !`).catch(() => {});
          }
        }
      }
    } catch {}
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    await handleReaction(client, reaction, user, true);
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    await handleReaction(client, reaction, user, false);
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot, refreshGamesCache, gamesCache: () => gamesCache };
