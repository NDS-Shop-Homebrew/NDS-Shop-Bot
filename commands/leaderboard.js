// /leaderboard — top XP avec médailles
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const prisma = require("../lib/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top XP / XP leaderboard"),

  async execute(interaction) {
    const lang = interaction.member?.roles?.cache?.some((r) => r.name === "English") ? "en" : "fr";
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
          .map((p, i) => `${medals[i] || `${i + 1}.`} **<@${p.discordId}>** — Niveau **${p.level}** ✨ ${Number(p.xp)} XP`)
          .join("\n")
      )
      .setFooter({ text: lang === "fr" ? "Classez-vous en discutant !" : "Rank up by chatting!" });
    await interaction.reply({ embeds: [embed] });
  },
};