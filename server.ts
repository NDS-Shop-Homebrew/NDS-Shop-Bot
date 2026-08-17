import "dotenv/config";
import { startBot, pollNewGames, refreshGamesCache } from "./index.ts";
import { createDashboard } from "./dashboard.ts";
import { PORT } from "./config.ts";
import { botLog } from "./lib/botLog.ts";
import type { Client } from "discord.js";

declare module "discord.js" {
  interface Client {
    pollNow?: () => Promise<void>;
  }
}

(async () => {
  let client: Client | null = null;
  try {
    client = await startBot();
    client.pollNow = async () => {
      await refreshGamesCache();
      await pollNewGames(client!);
    };
  } catch (err) {
    await botLog("error", `Échec du démarrage du bot: ${(err as Error).message}`);
  }

  const app = createDashboard(client);
  app.listen(PORT, () => {
    botLog("info", `Dashboard démarré sur http://localhost:${PORT}`);
  });
})();
