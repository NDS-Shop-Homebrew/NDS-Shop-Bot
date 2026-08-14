// Résout les mentions textuelles @username / @display dans un message en <@id>.
// Utilise la liste des membres du serveur (fetched une fois, cache).

const { GUILD_ID } = require("../config");
let membersCache = null;
let membersCacheAt = 0;
const CACHE_TTL = 120_000; // 2 min

async function resolveMentions(client, text) {
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

  // Regex: @un-mot-ou-plus  ou  @pseudo.avec.des-caractères
  return text.replace(/@([\wÀ-ÿ\s-]+)/gi, (match, name) => {
    const q = name.trim().toLowerCase();
    if (q === "everyone" || q === "here") return match; // laisse passer @everyone @here
    const found = membersCache.find((m) => m.username === q || m.display === q || m.username.startsWith(q) || m.display.startsWith(q));
    if (found) return `<@${found.id}>`;
    return match;
  });
}

module.exports = { resolveMentions };