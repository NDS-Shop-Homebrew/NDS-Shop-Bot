const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { T, detectLang } = require("../lib/lang");
const prisma = require("../lib/db");

module.exports = {
  data: new SlashCommandBuilder().setName("stats").setDescription("Statistiques du catalogue / Catalog stats"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const res = await fetch("https://db-nds-shop.fr/api/v1/stats", { signal: AbortSignal.timeout(8000) });
      const s = await res.json();
      const sysCount = Object.keys(s.systems || {}).length;
      const systems = Object.entries(s.systems || {})
        .map(([sys, n]) => `• **${sys}**: ${n} ${t.games}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#0072CE")
        .setTitle("📊 " + t.statsTitle)
        .setDescription(systems || t.unknown)
        .addFields(
          { name: `🎮 ${t.games}`, value: `**${s.games}**`, inline: true },
          { name: `🖥️ ${t.systems}`, value: `**${sysCount}**`, inline: true },
          ...(s.lastUpdated ? [{ name: `📅 ${t.lastUpdated}`, value: new Date(s.lastUpdated).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US"), inline: true }] : [])
        )
        .setThumbnail("https://db-nds-shop.fr/logo.png")
        .setFooter({ text: "NDS-Shop" });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};