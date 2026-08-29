import { EmbedBuilder } from "discord.js";
import { API_BASE_URL } from "../config.js";

export interface GameForEmbed {
  title?: string;
  author?: string;
  version?: string;
  systems?: string[];
  titleId?: string;
  updated?: string;
  icon?: string;
  stars?: string;
  fileName?: string;
  downloads?: Record<string, { url: string }>;
  boxart?: string | null;
}

export function buildEmbed(template: string, g: GameForEmbed, color: string) {
  const vars = {
    title: g.title || "",
    author: g.author || "N/A",
    version: g.version || "N/A",
    systems: (g.systems || []).join(", ") || "N/A",
    titleId: g.titleId || "N/A",
    stars: g.stars || "N/A",
    downloadUrl: (g.downloads && Object.values(g.downloads)[0]?.url) || `${API_BASE_URL}/games/${encodeURIComponent(g.fileName || "")}`,
    gameUrl: `${API_BASE_URL}/game/${g.fileName || ""}`,
    updated: g.updated ? new Date(g.updated).toLocaleDateString("fr-FR") : "",
  };
  const description = template.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? (vars as Record<string, string>)[k] : `{{${k}}}`));

  const embed = new EmbedBuilder()
    .setColor(color as never)
    .setTitle(`${vars.title}`)
    .setURL(vars.gameUrl)
    .setDescription(description || null)
    .setThumbnail(g.icon || null);

  const boxart = g.boxart || null;
  if (boxart) embed.setImage(boxart);

  return embed;
}

export const DEFAULT_TEMPLATE = `**Author:** {{author}}
**Version:** {{version}}
**Systems:** {{systems}}
**Title ID:** {{titleId}}

[Download]({{downloadUrl}}) · [View page]({{gameUrl}})`;
