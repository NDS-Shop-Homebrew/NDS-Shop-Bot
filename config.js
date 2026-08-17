require("dotenv").config();

module.exports = {
  GUILD_ID: "1271186486070345843",
  API_BASE_URL: "https://db-nds-shop.fr",

  // Rôle pingué dans #game-info quand un nouveau jeu arrive
  ROLE_GAME_UPDATES: "Game Updates",

  // Salons cibles (LOGS)
  CHANNELS: {
    gameInfo: "game-info",
    suggestions: "suggestions",
    bugReports: "bug-reports",
    logMessages: "log-messages",
    logTickets: "log-tickets",
    logCommands: "log-commands",
    logErrors: "log-errors",
  },

  // Annonces automatiques : intervalle de poll de games.json (ms)
  POLL_INTERVAL_MS: 5 * 60 * 1000,

  // Dashboard
  PORT: Number(process.env.PORT || 3004),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || `http://localhost:${Number(process.env.PORT || 3004)}`,
};
