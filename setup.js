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
        { name: "règles", readOnly: true, topic: "Règles du serveur — à lire avant de participer." },
        { name: "annonces", readOnly: true, staffPing: true, keep: true, topic: "Annonces officielles du projet NDS-Shop." },
        { name: "annonces-jeux", readOnly: true, topic: "Nouveaux jeux ajoutés au catalogue — automatique." },
        { name: "game-info", readOnly: true, topic: "Dernier jeu ajouté au catalogue — mis à jour automatiquement." },
        { name: "changelog", readOnly: true, topic: "Historique des mises à jour du site et du catalogue." },
        { name: "roles", readOnly: true, topic: "Réagissez avec votre langue 🇫🇷/🇬🇧 pour accéder aux salons." },
      ],
    },
    {
      name: "🗨️ COMMUNAUTÉ FR",
      view: ["Membre", "Français"],
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
      view: ["Membre", "English"],
      channels: [
        { name: "general", topic: "General discussions in English — welcome!" },
        { name: "nintendo-ds", topic: "Everything Nintendo DS: games, tips, deals." },
        { name: "homebrew", topic: "NDS homebrew development — questions, projects, sharing." },
        { name: "help", topic: "Need help downloading, installing, or playing? Ask here." },
        { name: "sharing-suggestions", topic: "Share games, discoveries, and suggest improvements." },
      ],
    },
    {
      name: "🛠️ PROJET",
      view: ["Membre"],
      channels: [
        { name: "site-dev", topic: "Discussions autour du développement du site db-nds-shop.fr." },
        { name: "app-dev", topic: "Développement de l'application NDS-Shop (3DS/DSi)." },
        { name: "bug-reports", topic: "Signalez les bugs du site, de l'app ou du catalogue." },
        { name: "suggestions", topic: "Propositions d'améliorations pour tout le projet." },
      ],
    },
    {
      name: "🔒 ÉQUIPE",
      view: ["Admin", "Modérateur", "Développeur", "Tester"],
      channels: [
        { name: "dev-zone", topic: "Zone de développement : discussions techniques, revue de code." },
        { name: "testeurs", topic: "Espace testeurs : versions beta, retours, bugs." },
        { name: "moderation", topic: "Espace de modération : coordination de l'équipe." },
      ],
    },
    {
      name: "🎫 TICKETS",
      view: ["Admin", "Modérateur", "Développeur", "Tester"],
      channels: [{ name: "tickets-readme", topic: "Les tickets sont gérés automatiquement par le bot. DM le bot pour ouvrir un ticket." }],
    },
    {
      name: "📋 LOGS",
      view: ["Admin", "Modérateur", "Développeur", "Tester"],
      channels: [
        { name: "log-messages", topic: "Messages supprimés/édités (logs de modération)." },
        { name: "log-tickets", topic: "Activité des tickets : ouverture, fermeture, réponses." },
        { name: "log-commands", topic: "Utilisation des commandes du bot." },
        { name: "log-errors", topic: "Erreurs et avertissements du bot." },
      ],
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
