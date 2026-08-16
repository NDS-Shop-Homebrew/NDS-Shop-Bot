// Helpers API — wrapper léger autour de l'API publique db-nds-shop.
const { API_BASE_URL } = require("../config");

async function get(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// Liste les jeux (games.json) : [{ title, fileName, author, version, systems, icon, screenshots, titleId, ... }]
// Enrichit chaque jeu avec sa boxart (full.json), mappée par titre.
async function listGames() {
  const games = await get("/games.json");
  try {
    const full = await get("/data/full.json");
    const arr = Array.isArray(full) ? full : Object.values(full);
    const boxartByTitle = new Map();
    for (const f of arr) {
      const boxart = f.screenshots?.find((s) => s.description === "Boxart")?.url;
      if (boxart) boxartByTitle.set(f.title, boxart);
    }
    for (const g of games) g.boxart = boxartByTitle.get(g.title) || null;
  } catch {}
  return games;
}

// Recherche un jeu par serial via ndsdb (metadata enrichie)
async function metadata(serial) {
  return get(`/api/v1/ndsdb/metadata/${encodeURIComponent(serial)}`);
}

// Stats globales : { games, systems: {}, lastUpdated }
async function stats() {
  return get("/api/v1/stats");
}

// IDs Discord de l'équipe : { discordIds: [] }
async function teamIds() {
  return get("/api/v1/team");
}

// Présence d'un membre (Lanyard) : { discord_status, activities }
async function presence(id) {
  return get(`/api/v1/discord-presence/${id}`);
}

module.exports = { listGames, metadata, stats, teamIds, presence };
