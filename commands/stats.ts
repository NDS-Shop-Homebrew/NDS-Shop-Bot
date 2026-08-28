import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { T, detectLang } from "../lib/lang.ts";
import { API_BASE_URL } from "../config.ts";

export default {
  data: new SlashCommandBuilder().setName("stats").setDescription("Statistiques du catalogue / Catalog stats"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stats`, { signal: AbortSignal.timeout(8000) });
      const s = await res.json();
      const sysCount = Object.keys(s.systems || {}).length;
      const systems = Object.entries(s.systems || {})
        .map(([sys, n]) => `🕹️ **${sys}**: ${n} ${t.games}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#0072CE")
        .setTitle("📊 " + t.statsTitle)
        .setDescription(systems || t.unknown)
        .addFields(
          { name: `🎮 ${t.games}`, value: `**${s.games}**`, inline: true },
          { name: `🕹️ ${t.systems}`, value: `**${sysCount}**`, inline: true },
          ...(s.lastUpdated ? [{ name: `📅 ${t.lastUpdated}`, value: new Date(s.lastUpdated).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US"), inline: true }] : [])
        )
        .setThumbnail(`${API_BASE_URL}/logo.png`)
        .setFooter({ text: "NDS-Shop" });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};