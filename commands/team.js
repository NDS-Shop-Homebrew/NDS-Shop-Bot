// /team — l'équipe avec statut Discord
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { teamIds, presence } = require("../lib/api");
const { T, detectLang } = require("../lib/lang");

const STATUS_EMOJI = { online: "🟢", idle: "🟡", dnd: "🔴", offline: "⚪" };

module.exports = {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("L'équipe du projet / The project team"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const { discordIds } = await teamIds();
      if (!discordIds || !discordIds.length) {
        return interaction.editReply(t.teamEmpty);
      }
      const rows = [];
      for (const id of discordIds) {
        try {
          const p = await presence(id);
          const status = STATUS_EMOJI[p.discord_status] || STATUS_EMOJI.offline;
          rows.push(`${status} <@${id}> — ${t.status[p.discord_status] || t.status.offline}`);
        } catch {
          rows.push(`${STATUS_EMOJI.offline} <@${id}> — ${t.status.offline}`);
        }
      }
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(t.teamTitle)
        .setDescription(rows.join("\n"));
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};
