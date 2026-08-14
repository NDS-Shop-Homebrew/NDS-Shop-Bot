// NDS-Shop Bot — point d'entrée : démarre le bot + le dashboard ensemble.
require("dotenv").config();
const { startBot, pollNewGames, refreshGamesCache } = require("./index");
const { createDashboard } = require("./dashboard");
const { PORT } = require("./config");
const { botLog } = require("./lib/botLog");

(async () => {
  let client = null;
  try {
    client = await startBot();
    // Expose le poll pour le dashboard (déclenchement manuel)
    client.pollNow = async () => {
      await refreshGamesCache();
      await pollNewGames(client);
    };
  } catch (err) {
    // Si le bot échoue, le dashboard démarre quand même (le 502 ne masque plus le vrai souci)
    await botLog("error", `Échec du démarrage du bot: ${err.message}`);
  }

  const app = createDashboard(client);
  app.listen(PORT, () => {
    botLog("info", `Dashboard démarré sur http://localhost:${PORT}`);
  });
})();
