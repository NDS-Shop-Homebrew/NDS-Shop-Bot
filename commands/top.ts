import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listGames } from "../lib/api.ts";
import prisma from "../lib/db.ts";
import { detectLang } from "../lib/lang.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("Jeux les plus populaires / Most popular games"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const profiles = await prisma.userProfile.findMany({ select: { favorites: true } });
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      try {
        for (const f of JSON.parse(p.favorites || "[]") as string[]) counts[f] = (counts[f] || 0) + 1;
      } catch {}
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!top.length) {
      return interaction.reply(lang === "fr" ? "Personne n'a encore de favoris. Lancez-vous : /favorites add <jeu> !" : "No favorites yet. Start now: /favorites add <game>!");
    }
    const games = await listGames().catch(() => []);
    const medals = ["🥇", "🥈", "🥉"];
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(lang === "fr" ? "🔥 Jeux populaires" : "🔥 Popular games")
      .setThumbnail("https://db-nds-shop.fr/logo.png")
      .setDescription(
        top
          .map(([gTitle, n], i) => {
            const g = games.find((x) => x.title === gTitle);
            const icon = g?.icon ? `[🕹️](${g.icon})` : "";
            return `${medals[i] || `${i + 1}.`} **${gTitle}** ${icon} — ⭐ ${n} favori${n > 1 ? "s" : ""}`;
          })
          .join("\n")
      )
      .setFooter({ text: lang === "fr" ? "Top des favoris du serveur" : "Server favorites ranking" });
    await interaction.reply({ embeds: [embed] });
  },
};