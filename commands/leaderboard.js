// /leaderboard — top XP
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const prisma = require("../lib/db");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top XP / XP leaderboard"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const top = await prisma.userProfile.findMany({
      orderBy: { xp: "desc" },
      take: 10,
    });
    if (!top.length) {
      return interaction.reply(lang === "fr" ? "Pas encore de classement !" : "No leaderboard yet!");
    }
    const embed = new EmbedBuilder()
      .setColor("#F1C40F")
      .setTitle(lang === "fr" ? "🏆 Classement XP" : "🏆 XP Leaderboard")
      .setDescription(
        top
          .map(
            (p, i) =>
              `${["🥇", "🥈", "🥉"][i] || `${i + 1}.`} **<@${p.discordId}>** — niveau ${p.level} (${Number(p.xp)} XP)`
          )
          .join("\n")
      );
    await interaction.reply({ embeds: [embed] });
  },
};
