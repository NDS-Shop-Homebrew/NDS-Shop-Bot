// Setup one-shot du serveur Discord NDS-Shop via le bot.
// Usage : node setup.js
// Prérequis : token dans .env, bot invité avec Manage Channels + Manage Roles.
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require("discord.js");
require("dotenv").config();

const GUILD_ID = "1271186486070345843";
// Salons existants à conserver (déplacés dans leur catégorie, pas supprimés)
const KEEP_CHANNEL_NAMES = ["annonces"];

const config = {
  deleteExisting: true,
  roles: [
    { name: "Admin", color: "#E74C3C" },
    { name: "Modérateur", color: "#2ECC71" },
    { name: "Développeur", color: "#5865F2" },
    { name: "Tester", color: "#F1C40F" },
    { name: "Contributeur", color: "#9B59B6" },
    { name: "Membre", color: "#95A5A6" },
    { name: "Français", color: "#3498DB" },
    { name: "English", color: "#1ABC9C" },
  ],
  // view :
  //   "@everyone"  → visible par tous
  //   [rôles]      → visible UNIQUEMENT par ces rôles (@everyone voit rien)
  categories: [
    {
      name: "📢 INFORMATIONS",
      view: "@everyone",
      channels: [
        { name: "règles", readOnly: true },
        { name: "annonces", readOnly: true, staffPing: true, keep: true },
        { name: "annonces-jeux", readOnly: true },
        { name: "changelog", readOnly: true },
        { name: "roles", readOnly: true },
      ],
    },
    {
      name: "🗨️ COMMUNAUTÉ FR",
      view: ["Membre", "Français"],
      channels: [
        { name: "général" },
        { name: "nintendo-ds" },
        { name: "homebrew" },
        { name: "entraide" },
        { name: "partage-et-suggestions" },
      ],
    },
    {
      name: "🌍 COMMUNITY EN",
      view: ["Membre", "English"],
      channels: [
        { name: "general" },
        { name: "nintendo-ds" },
        { name: "homebrew" },
        { name: "help" },
        { name: "sharing-suggestions" },
      ],
    },
    {
      name: "🎮 GAMING",
      view: ["Membre"],
      channels: [
        { name: "retrogaming" },
        { name: "speedrun" },
        { name: "multiplayer" },
        { name: "salon-vocal", voice: true },
        { name: "vocal-jeux", voice: true },
      ],
    },
    {
      name: "🛠️ PROJET",
      view: ["Membre"],
      channels: [
        { name: "site-dev" },
        { name: "app-dev" },
        { name: "bug-reports" },
        { name: "suggestions" },
      ],
    },
    {
      name: "🔒 ÉQUIPE",
      view: ["Admin", "Modérateur", "Développeur", "Tester"],
      channels: [
        { name: "dev-zone" },
        { name: "testeurs" },
        { name: "moderation" },
      ],
    },
    {
      name: "🎫 TICKETS",
      view: ["Admin", "Modérateur", "Développeur", "Tester"],
      channels: [{ name: "tickets-readme" }],
    },
    {
      name: "🤖 BOTS",
      view: ["Admin", "Modérateur", "Développeur", "Tester"],
      channels: [{ name: "bot-logs" }],
    },
  ],
};

// Rôles staff autorisés à mentionner @everyone sur les salons staffPing
const STAFF_PING_ROLES = ["Admin", "Modérateur", "Développeur"];

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
        const r = await guild.roles.create({ name: def.name, color: def.color });
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
            console.log(`  #${def.name} : réutilisé (déplacé dans la catégorie)`);
            continue;
          }
        }

        const channel = await guild.channels.create({
          name: def.name,
          type,
          parent: category.id,
          permissionOverwrites: overrides,
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
