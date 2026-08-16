// Rendu du template #game-info (salon Discord du dernier jeu ajouté).
// Template éditable depuis le dashboard (BotSetting gameInfoTemplate).
// Variables : {{title}} {{author}} {{version}} {{systems}} {{icon}} {{boxart}}
//            {{downloadUrl}} {{gameUrl}} {{updated}}
const { API_BASE_URL } = require("../config");

function renderTemplate(template, g) {
  const vars = {
    title: g.title || "",
    author: g.author || "N/A",
    version: g.version || "N/A",
    systems: (g.systems || []).join(", ") || "N/A",
    icon: g.icon || "",
    boxart: g.boxart || "",
    downloadUrl: `${API_BASE_URL}/games/${encodeURIComponent(g.fileName)}`,
    gameUrl: `${API_BASE_URL}/game/${g.fileName}`,
    updated: g.updated ? new Date(g.updated).toLocaleDateString("fr-FR") : "",
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}

const DEFAULT_TEMPLATE = `**🆕 Dernier jeu ajouté : {{title}}**\n\n**Auteur :** {{author}}\n**Version :** {{version}}\n**Systèmes :** {{systems}}\n\n[Télécharger]({{downloadUrl}}) · [Voir la fiche]({{gameUrl}})`;

module.exports = { renderTemplate, DEFAULT_TEMPLATE };