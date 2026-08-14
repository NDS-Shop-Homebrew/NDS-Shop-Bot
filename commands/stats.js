// /stats — statistiques globales
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { stats } = require("../lib/api");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Statistiques du catalogue / Catalog stats"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const s = await stats();
      const systems = Object.entries(s.systems || {})
        .map(([sys, n]) => `• ${sys}: **${n}**`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(t.statsTitle)
        .addFields(
          { name: t.games, value: `**${s.games}**`, inline: true },
          { name: t.systems, value: systems || t.unknown, inline: true }
        );
      if (s.lastUpdated) {
        embed.setFooter({ text: `${t.lastUpdated}: ${s.lastUpdated}` });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};
