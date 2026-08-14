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
async function listGames() {
  return get("/games.json");
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
