// /rank — niveau et XP du membre avec barre de progression
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const prisma = require("../lib/db");
const { xpForLevel } = require("../lib/leveling");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Votre niveau / Your level"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const profile = await prisma.userProfile.findUnique({
      where: { discordId: interaction.user.id },
    });
    if (!profile) {
      return interaction.reply(lang === "fr" ? "Vous n'avez pas encore de niveau — écrivez un peu !" : "You don't have a level yet — chat a bit!");
    }
    const cur = Number(profile.xp);
    const curLevelXp = xpForLevel(profile.level);
    const nextLevelXp = xpForLevel(profile.level + 1);
    const pct = Math.min(100, Math.max(0, Math.round(((cur - curLevelXp) / (nextLevelXp - curLevelXp)) * 100)));
    const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`${interaction.user.username} — ${lang === "fr" ? "Niveau" : "Level"} ${profile.level}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(`**${bar}** ${pct}%`)
      .addFields(
        { name: "⭐ " + (lang === "fr" ? "Niveau" : "Level"), value: `**${profile.level}**`, inline: true },
        { name: "✨ XP", value: `${cur} / ${nextLevelXp}`, inline: true },
        { name: "💬 " + (lang === "fr" ? "Messages" : "Messages"), value: `${profile.totalMsgs}`, inline: true },
      )
      .setFooter({ text: `XP totale : ${cur}` });
    await interaction.reply({ embeds: [embed] });
  },
};