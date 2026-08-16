// Rendu du salon #game-info (dernier jeu ajouté) sous forme d'embed.
// Template texte éditable depuis le dashboard (BotSetting gameInfoTemplate).
// Variables : {{title}} {{author}} {{version}} {{systems}} {{titleId}}
//            {{downloadUrl}} {{gameUrl}} {{updated}} {{stars}}
const { EmbedBuilder } = require("discord.js");
const { API_BASE_URL } = require("../config");

function buildEmbed(template, g, color) {
  const vars = {
    title: g.title || "",
    author: g.author || "N/A",
    version: g.version || "N/A",
    systems: (g.systems || []).join(", ") || "N/A",
    titleId: g.titleId || "N/A",
    stars: g.stars || "N/A",
    downloadUrl: (g.downloads && Object.values(g.downloads)[0]?.url) || `${API_BASE_URL}/games/${encodeURIComponent(g.fileName)}`,
    gameUrl: `${API_BASE_URL}/game/${g.fileName}`,
    updated: g.updated ? new Date(g.updated).toLocaleDateString("fr-FR") : "",
  };
  const description = template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${vars.title}`)
    .setURL(vars.gameUrl)
    .setDescription(description || null)
    .setThumbnail(g.icon || null);

  const boxart = g.boxart || null;
  if (boxart) embed.setImage(boxart);

  return embed;
}

const DEFAULT_TEMPLATE = `**Auteur :** {{author}}
**Version :** {{version}}
**Systèmes :** {{systems}}
**Title ID :** {{titleId}}

[Télécharger]({{downloadUrl}}) · [Voir la fiche]({{gameUrl}})`;

module.exports = { buildEmbed, DEFAULT_TEMPLATE };