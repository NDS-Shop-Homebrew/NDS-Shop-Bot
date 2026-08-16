// Setup one-shot du serveur Discord NDS-Shop via le bot.
// Usage : node setup.js [--force]
//   --force : supprime l'existant (salons/catégories) avant recréation.
//   sans --force : crée uniquement les rôles/catégories/salons manquants.
// Prérequis : token dans .env, bot invité avec Manage Channels + Manage Roles.
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

const GUILD_ID = "1271186486070345843";
// Salons existants à conserver (déplacés dans leur catégorie, pas supprimés)
const KEEP_CHANNEL_NAMES = ["announcements"];

const config = {
  deleteExisting: process.argv.includes("--force"),
  roles: [
    { name: "Admin", color: "#E74C3C" },
    { name: "Moderator", color: "#2ECC71" },
    { name: "Developer", color: "#5865F2" },
    { name: "Tester", color: "#F1C40F" },
    { name: "Contributor", color: "#9B59B6" },
    { name: "Member", color: "#95A5A6" },
    { name: "French", color: "#3498DB" },
    { name: "English", color: "#1ABC9C" },
    { name: "Game Updates", color: "#00B0F4", mentionable: true },
  ],
  // view :
  //   "@everyone"  → visible par tous
  //   [rôles]      → visible UNIQUEMENT par ces rôles (@everyone voit rien)
  categories: [
    {
      name: "📢 INFORMATION",
      view: "@everyone",
      channels: [
        { name: "rules", readOnly: true, topic: "Server rules — read before joining in." },
        { name: "announcements", readOnly: true, staffPing: true, keep: true, topic: "Official NDS-Shop project announcements." },
        { name: "game-announcements", readOnly: true, topic: "New games added to the catalogue — automatic." },
        { name: "game-info", readOnly: true, topic: "Latest games added to the catalogue — updated automatically." },
        { name: "changelog", readOnly: true, topic: "Site and catalogue update history." },
        { name: "roles", readOnly: true, topic: "React with your language 🇫🇷/🇬🇧 to unlock the channels." },
      ],
    },
    {
      name: "🗨️ COMMUNAUTÉ FR",
      view: ["Member", "French"],
      channels: [
        { name: "général", topic: "Discussions générales en français — bienvenue !" },
        { name: "nintendo-ds", topic: "Tout sur la Nintendo DS : jeux, astuces, bons plans." },
        { name: "homebrew", topic: "Développement homebrew NDS — questions, projets, partage." },
        { name: "entraide", topic: "Besoin d'aide pour télécharger, installer ou jouer ? C'est ici." },
        { name: "partage-et-suggestions", topic: "Proposez des jeux, partagez vos trouvailles, suggérez des améliorations." },
      ],
    },
    {
      name: "🌍 COMMUNITY EN",
      view: ["Member", "English"],
      channels: [
        { name: "general", topic: "General discussions in English — welcome!" },
        { name: "nintendo-ds", topic: "Everything Nintendo DS: games, tips, deals." },
        { name: "homebrew", topic: "NDS homebrew development — questions, projects, sharing." },
        { name: "help", topic: "Need help downloading, installing, or playing? Ask here." },
        { name: "sharing-suggestions", topic: "Share games, discoveries, and suggest improvements." },
      ],
    },
    {
      name: "🛠️ PROJECT",
      view: ["Member"],
      channels: [
        { name: "site-dev", topic: "Discussions around db-nds-shop.fr development." },
        { name: "app-dev", topic: "NDS-Shop application development (3DS/DSi)." },
        { name: "bug-reports", topic: "Report site, app, or catalogue bugs." },
        { name: "suggestions", topic: "Improvement proposals for the whole project." },
      ],
    },
    {
      name: "🔒 TEAM",
      view: ["Admin", "Moderator", "Developer", "Tester"],
      channels: [
        { name: "dev-zone", topic: "Development zone: technical discussions, code review." },
        { name: "testers", topic: "Tester space: beta versions, feedback, bugs." },
        { name: "moderation", topic: "Moderation space: team coordination." },
      ],
    },
    {
      name: "🎫 TICKETS",
      view: ["Admin", "Moderator", "Developer", "Tester"],
      channels: [{ name: "tickets-readme", topic: "Tickets are handled automatically by the bot. DM the bot to open a ticket." }],
    },
    {
      name: "📋 LOGS",
      view: ["Admin", "Moderator", "Developer", "Tester"],
      channels: [
        { name: "log-messages", topic: "Deleted/edited messages (moderation logs)." },
        { name: "log-tickets", topic: "Ticket activity: opening, closing, replies." },
        { name: "log-commands", topic: "Bot command usage." },
        { name: "log-errors", topic: "Bot errors and warnings." },
      ],
    },
  ],
};

// Rôles staff autorisés à mentionner @everyone sur les salons staffPing
const STAFF_PING_ROLES = ["Admin", "Moderator", "Developer"];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      console.error(`❌ Serveur ${GUILD_ID} introuvable (le bot y est-il invité ?)`);
      process.exit(1);
    }
    console.log(`🎯 Serveur : ${guild.name}`);

    // ---- Rôles ----
    const roleByName = {};
    for (const r of guild.roles.cache.values()) roleByName[r.name] = r;
    for (const def of config.roles) {
      if (roleByName[def.name]) {
        console.log(`  rôle ${def.name} : déjà présent`);
      } else {
        const r = await guild.roles.create({ name: def.name, color: def.color, mentionable: !!def.mentionable });
        roleByName[def.name] = r;
        console.log(`  rôle ${def.name} : créé`);
      }
    }
    // Le rôle du bot lui-même (pour qu'il garde accès aux salons cachés)
    const botRole = guild.members.me.roles.highest;

    // ---- Suppression de l'existant (sauf keep) ----
    if (config.deleteExisting) {
      const keep = new Set(KEEP_CHANNEL_NAMES.map((n) => n.toLowerCase()));
      const keptChannels = guild.channels.cache.filter(
        (ch) => ch.type !== ChannelType.GuildCategory && keep.has(ch.name.toLowerCase())
      );
      // Un salon "keep" dans une catégorie serait supprimé avec elle → on le sort d'abord
      for (const ch of keptChannels.values()) {
        if (ch.parentId) await ch.setParent(null);
      }
      const toDelete = [];
      for (const ch of guild.channels.cache.values()) {
        if (ch.type !== ChannelType.GuildCategory && keep.has(ch.name.toLowerCase())) continue;
        toDelete.push(ch);
      }
      for (const ch of toDelete) {
        await ch.delete().catch(() => {});
      }
      console.log(`🧹 Supprimé ${toDelete.length} catégorie(s)/salon(s)`);
    }

    // ---- Catégories + salons ----
    for (const cat of config.categories) {
      // Overrides de visibilité au niveau de la CATÉGORIE (hérités par les salons)
      const catOverrides = [];
      const everyone = guild.roles.everyone;
      const canViewRoles =
        cat.view === "@everyone"
          ? []
          : cat.view.map((rn) => roleByName[rn]).filter(Boolean);
      if (cat.view !== "@everyone") {
        catOverrides.push({
          id: everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        });
        for (const r of canViewRoles) {
          catOverrides.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] });
        }
      }
      // Le bot doit toujours voir ses salons
      if (botRole && botRole.id !== everyone.id) {
        catOverrides.push({ id: botRole.id, allow: [PermissionFlagsBits.ViewChannel] });
      }

      const category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: catOverrides,
      });

      for (const def of cat.channels) {
        const type = def.voice ? ChannelType.GuildVoice : ChannelType.GuildText;
        const overrides = [];

        // readOnly / staffPing (par salon)
        const deny = [];
        if (def.readOnly) {
          deny.push(PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads);
        }
        if (def.staffPing) {
          deny.push(PermissionFlagsBits.MentionEveryone);
        }
        if (deny.length) overrides.push({ id: everyone.id, deny });

        if (def.staffPing) {
          for (const rn of STAFF_PING_ROLES) {
            const r = roleByName[rn];
            if (r) overrides.push({ id: r.id, allow: [PermissionFlagsBits.MentionEveryone] });
          }
        }

        // Salon existant à réutiliser uniquement si marqué keep (ex: #annonces)
        if (def.keep) {
          const existing = guild.channels.cache.find(
            (ch) =>
              ch.name.toLowerCase() === def.name.toLowerCase() &&
              ch.type !== ChannelType.GuildCategory
          );
          if (existing) {
            await existing.setParent(category.id);
            await existing.permissionOverwrites.set(overrides);
            if (def.topic && existing.isTextBased()) await existing.setTopic(def.topic).catch(() => {});
            console.log(`  #${def.name} : réutilisé (déplacé dans la catégorie)`);
            continue;
          }
        }

        const channel = await guild.channels.create({
          name: def.name,
          type,
          parent: category.id,
          permissionOverwrites: overrides,
          topic: def.topic || undefined,
        });
        console.log(`  #${def.name} (${type === ChannelType.GuildText ? "texte" : "vocal"}) créé`);
      }
    }

    console.log("✅ Setup terminé !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);
