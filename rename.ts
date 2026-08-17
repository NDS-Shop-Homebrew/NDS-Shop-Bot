import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import "dotenv/config";
import prisma from "./lib/db.ts";

const GUILD_ID = "1271186486070345843";

const ROLE_RENAMES: Record<string, string> = {
  Membre: "Member",
  Contributeur: "Contributor",
  "Développeur": "Developer",
  "Modérateur": "Moderator",
  Français: "French",
  Anglais: "English",
};

const CHANNEL_RENAMES: Record<string, string> = {
  annonces: "announcements",
  "annonces-jeux": "game-announcements",
  règles: "rules",
  testeurs: "testers",
};

const CATEGORY_RENAMES: Record<string, string> = {
  "📢 INFORMATIONS": "📢 INFORMATION",
  "👥 COMMUNAUTÉ EN": "👥 COMMUNITY EN",
  "🛠️ PROJET": "🛠️ PROJECT",
  "👔 ÉQUIPE": "👔 TEAM",
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  console.log(`✅ Connecté en tant que ${client.user!.tag}`);
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      console.error(`❌ Serveur ${GUILD_ID} introuvable`);
      process.exit(1);
    }

    console.log("État actuel des salons/catégories :");
    for (const ch of guild.channels.cache.values()) {
      console.log(`  ${ch.type === 4 ? "[CAT]" : "[CH] "} ${ch.name}`);
    }
    console.log("État actuel des rôles :");
    for (const r of guild.roles.cache.values()) {
      if (r.name !== "@everyone") console.log(`  ${r.name}`);
    }

    for (const [oldName, newName] of Object.entries(ROLE_RENAMES)) {
      const role = guild.roles.cache.find((r) => r.name === oldName);
      if (role) {
        await role.setName(newName).then(() => console.log(`  rôle ${oldName} -> ${newName}`));
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
        await ch.setName(newName).then(() => console.log(`  #${oldName} -> #${newName}`));
      } else {
        console.log(`  #${oldName} : absent, rien à faire`);
      }
    }

    for (const [oldName, newName] of Object.entries(CATEGORY_RENAMES)) {
      const cat = guild.channels.cache.find((c) => c.name === oldName && c.type === 4);
      if (cat) {
        await cat.setName(newName).then(() => console.log(`  catégorie ${oldName} -> ${newName}`));
      } else {
        console.log(`  catégorie ${oldName} : absente, rien à faire`);
      }
    }

    console.log("✅ Renommage terminé !");

    const required = [
      { name: "game-announcements", parent: "📢 INFORMATION", readOnly: true, topic: "New games added to the catalogue — automatic." },
      { name: "roles", parent: "📢 INFORMATION", readOnly: true, topic: "React with your language 🇫🇷/🇬🇧 to unlock the channels." },
    ];
    for (const req of required) {
      if (guild.channels.cache.some((c) => c.name === req.name)) continue;
      const parent = guild.channels.cache.find((c) => c.name === req.parent && c.type === 4);
      const overrides = req.readOnly
        ? [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads] }]
        : [];
      const created = await guild.channels.create({
        name: req.name,
        type: 0,
        parent: parent?.id,
        topic: req.topic,
        permissionOverwrites: overrides,
      });
      console.log(`  #${req.name} créé (${created.id})`);
    }

    const row = await prisma.botSetting.findUnique({ where: { key: "permissionMatrix" } });
    if (row?.value) {
      const map: Record<string, string> = { Membre: "Member", Contributeur: "Contributor", "Développeur": "Developer", "Modérateur": "Moderator" };
      const parsed = JSON.parse(row.value) as Record<string, string[]>;
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
        console.log("  permissionMatrix : rôles FR -> EN (BDD)");
      }
    }
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", (err as Error).message);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);