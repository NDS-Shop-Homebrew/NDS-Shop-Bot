require("dotenv").config();

module.exports = {
  GUILD_ID: "1271186486070345843",
  API_BASE_URL: "https://db-nds-shop.fr",

  // Choix de rôle (#roles)
  ROLE_CHANNEL: "roles",
  ROLE_MEMBRE: "Membre",
  ROLE_MENU: {
    "🇫🇷": "Français",
    "🇬🇧": "English",
  },
  ROLE_MENU_MESSAGE_ID: process.env.ROLE_MENU_MESSAGE_ID || "",

  // Salons cibles (LOGS)
  CHANNELS: {
    annoncesJeux: "annonces-jeux",
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
