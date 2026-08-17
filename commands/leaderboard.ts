import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../lib/db.ts";
import { detectLang } from "../lib/lang.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top XP / XP leaderboard"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const top = await prisma.userProfile.findMany({
      orderBy: { xp: "desc" },
      take: 10,
    });
    if (!top.length) {
      return interaction.reply(lang === "fr" ? "Pas encore de classement !" : "No leaderboard yet!");
    }
    const medals = ["🥇", "🥈", "🥉"];
    const embed = new EmbedBuilder()
      .setColor("#F1C40F")
      .setTitle(lang === "fr" ? "🏆 Classement XP" : "🏆 XP Leaderboard")
      .setThumbnail("https://db-nds-shop.fr/logo.png")
      .setDescription(
        top
          .map((p, i) => `${medals[i] || `${i + 1}.`} **<@${p.discordId}>** — Niveau **${p.level}** ✅ ${Number(p.xp)} XP`)
          .join("\n")
      )
      .setFooter({ text: lang === "fr" ? "Classez-vous en discutant !" : "Rank up by chatting!" });
    await interaction.reply({ embeds: [embed] });
  },
};
