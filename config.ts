import "dotenv/config";

export const GUILD_ID = "1271186486070345843";
export const API_BASE_URL = process.env.SITE_URL || "https://db-nds-shop.fr";

export const ROLE_GAME_UPDATES = "Game Updates";

export const CHANNELS = {
  gameInfo: "1537993420985995424",
  gameRequests: "game-requests",
  suggestions: "suggestions",
  bugReports: "bug-reports",
  logMessages: "log-messages",
  logTickets: "log-tickets",
  logCommands: "log-commands",
  logErrors: "log-errors",
};

export const POLL_INTERVAL_MS = 5 * 60 * 1000;

export const PORT = Number(process.env.PORT || 3004);
export const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || `http://localhost:${Number(process.env.PORT || 3004)}`;
