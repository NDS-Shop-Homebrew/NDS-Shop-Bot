import type { Client } from "discord.js";
import { GUILD_ID } from "../config.ts";

let membersCache: { id: string; username: string; display: string }[] | null = null;
let membersCacheAt = 0;
const CACHE_TTL = 120_000;

export async function resolveMentions(client: Client | null, text: string) {
  if (!text || !client) return text;
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return text;

  const now = Date.now();
  if (!membersCache || now - membersCacheAt > CACHE_TTL) {
    try {
      const fetched = await guild.members.fetch();
      membersCache = [];
      for (const [, m] of fetched) {
        if (m.user.bot) continue;
        membersCache.push({ id: m.user.id, username: m.user.username.toLowerCase(), display: (m.displayName || "").toLowerCase() });
      }
      membersCacheAt = now;
    } catch {
      return text;
    }
  }

  return text.replace(/@([\wà-ÿ\s-]+)/gi, (match, name) => {
    const q = name.trim().toLowerCase();
    if (q === "everyone" || q === "here") return match;
    const found = membersCache?.find((m) => m.username === q || m.display === q || m.username.startsWith(q) || m.display.startsWith(q));
    if (found) return `<@${found.id}>`;
    return match;
  });
}
