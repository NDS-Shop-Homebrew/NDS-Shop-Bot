// Leveling : XP par message, niveaux, rôles récompenses.
const prisma = require("./db");
const { botLog } = require("./botLog");

const DEFAULT_CONFIG = {
  enabled: true,
  xpPerMessage: 15,
  cooldownMs: 60000, // 1 message XP / min
  excludedChannels: ["bot-logs"],
  roles: [
    { level: 5, role: "Membre" },
    { level: 10, role: "Contributeur" },
  ],
};

async function getConfig() {
  try {
    const row = await prisma.botSetting.findUnique({ where: { key: "levelingConfig" } });
    if (row?.value) return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch {}
  return DEFAULT_CONFIG;
}

// Ajoute de l'XP si cooldown passé. Retourne { leveledUp, newLevel } ou null.
async function grantXp(discordId, guild) {
  const cfg = await getConfig();
  if (!cfg.enabled) return null;

  const profile = await prisma.userProfile.upsert({
    where: { discordId },
    update: {},
    create: { discordId, xp: 0, level: 1, totalMsgs: 0 },
  });

  const now = Date.now();
  const last = profile.lastXpAt ? new Date(profile.lastXpAt).getTime() : 0;
  if (now - last < cfg.cooldownMs) return null;

  const newXp = Number(profile.xp) + cfg.xpPerMessage;
  const newLevel = Math.floor(1 + Math.sqrt(newXp / 100));
  const leveledUp = newLevel > profile.level;

  await prisma.userProfile.update({
    where: { discordId },
    data: { xp: newXp, level: newLevel, totalMsgs: profile.totalMsgs + 1, lastXpAt: new Date() },
  });

  // Rôles récompenses
  if (leveledUp && guild) {
    for (const r of cfg.roles || []) {
      if (newLevel >= r.level) {
        const role = guild.roles.cache.find((x) => x.name === r.role);
        const member = guild.members.cache.get(discordId) || (await guild.members.fetch(discordId).catch(() => null));
        if (role && member && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(() => {});
        }
      }
    }
  }

  return leveledUp ? { oldLevel: profile.level, newLevel } : null;
}

// XP nécessaire pour un niveau (formule inverse)
function xpForLevel(level) {
  return 100 * (level - 1) * (level - 1);
}

module.exports = { grantXp, getConfig, xpForLevel };
