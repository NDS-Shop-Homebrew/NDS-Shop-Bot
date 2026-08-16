// Renommage one-shot vers l'anglais (rôles + salons + catégories existants).
// Usage : node rename.js
// Prérequis : token dans .env, bot invité avec Manage Channels + Manage Roles.
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const prisma = require("./lib/db");

const GUILD_ID = "1271186486070345843";

const ROLE_RENAMES = {
  Membre: "Member",
  Contributeur: "Contributor",
  "Développeur": "Developer",
  "Modérateur": "Moderator",
  Français: "French",
  Anglais: "English",
};

const CHANNEL_RENAMES = {
  annonces: "game-announcements",
};

const CATEGORY_RENAMES = {
  "🌍 COMMUNAUTÉ EN": "🌍 COMMUNITY EN",
  "🛠️ PROJET": "🛠️ PROJECT",
  "🔒 ÉQUIPE": "🔒 TEAM",
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      console.error(`❌ Serveur ${GUILD_ID} introuvable`);
      process.exit(1);
    }

    for (const [oldName, newName] of Object.entries(ROLE_RENAMES)) {
      const role = guild.roles.cache.find((r) => r.name === oldName);
      if (role) {
        await role.setName(newName).then(() => console.log(`  rôle ${oldName} → ${newName}`));
      } else if (!guild.roles.cache.some((r) => r.name === newName)) {
        console.log(`  rôle ${oldName} : absent, rien à faire`);
      }
    }

    if (!guild.roles.cache.some((r) => r.name === "Game Updates")) {
      const r = await guild.roles.create({ name: "Game Updates", color: "#00B0F4", mentionable: true });
      console.log(`  rôle Game Updates créé (${r.id})`);
    }

    for (const [oldName, newName] of Object.entries(CHANNEL_RENAMES)) {
      const ch = guild.channels.cache.find((c) => c.name === oldName);
      if (ch) {
        await ch.setName(newName).then(() => console.log(`  #${oldName} → #${newName}`));
      } else {
        console.log(`  #${oldName} : absent, rien à faire`);
      }
    }

    for (const [oldName, newName] of Object.entries(CATEGORY_RENAMES)) {
      const cat = guild.channels.cache.find((c) => c.name === oldName && c.type === 4);
      if (cat) {
        await cat.setName(newName).then(() => console.log(`  catégorie ${oldName} → ${newName}`));
      } else {
        console.log(`  catégorie ${oldName} : absente, rien à faire`);
      }
    }

    console.log("✅ Renommage terminé !");

    // Migration BDD : permissionMatrix (rôles FR → EN)
    const row = await prisma.botSetting.findUnique({ where: { key: "permissionMatrix" } });
    if (row?.value) {
      const map = { Membre: "Member", Contributeur: "Contributor", "Développeur": "Developer", "Modérateur": "Moderator" };
      const parsed = JSON.parse(row.value);
      let changed = false;
      for (const key of Object.keys(parsed)) {
        parsed[key] = parsed[key].map((r) => {
          const en = map[r];
          if (en) changed = true;
          return en || r;
        });
      }
      if (changed) {
        await prisma.botSetting.update({
          where: { key: "permissionMatrix" },
          data: { value: JSON.stringify(parsed) },
        });
        console.log("  permissionMatrix : rôles FR → EN (BDD)");
      }
    }
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);