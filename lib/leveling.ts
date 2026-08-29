import type { Guild, Role } from "discord.js";
import prisma from "./db.js";
import { botLog } from "./botLog.js";

const DEFAULT_CONFIG = {
  enabled: true,
  xpPerMessage: 15,
  cooldownMs: 60000,
  excludedChannels: ["log-messages", "log-tickets", "log-commands", "log-errors", "tickets-readme", "bot-logs"],
  roles: [
    { level: 5, role: "Member" },
    { level: 10, role: "Contributor" },
  ],
};

export async function getConfig() {
  try {
    const row = await prisma.botSetting.findUnique({ where: { key: "levelingConfig" } });
    if (row?.value) return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch {}
  return DEFAULT_CONFIG;
}

export async function grantXp(discordId: string, guild: Guild | null) {
  const cfg = await getConfig();
  if (!cfg.enabled) return null;

  const profile = await prisma.botUserProfile.upsert({
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

  await prisma.botUserProfile.update({
    where: { discordId },
    data: { xp: newXp, level: newLevel, totalMsgs: profile.totalMsgs + 1, lastXpAt: new Date() },
  });

  if (leveledUp && guild) {
    for (const r of cfg.roles || []) {
      if (newLevel >= r.level) {
        const role: Role | undefined = guild.roles.cache.find((x) => x.name === r.role);
        const member = guild.members.cache.get(discordId) || (await guild.members.fetch(discordId).catch(() => null));
        if (role && member && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(() => {});
        }
      }
    }
  }

  return leveledUp ? { oldLevel: profile.level, newLevel } : null;
}

export function xpForLevel(level: number) {
  return 100 * (level - 1) * (level - 1);
}
