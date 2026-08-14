// /purge <n> — supprime n messages du salon
const { SlashCommandBuilder } = require("discord.js");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Supprimer des messages / Bulk delete messages")
    .addIntegerOption((o) => o.setName("count").setDescription("Nombre de messages").setRequired(true).setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    const count = interaction.options.getInteger("count");
    await interaction.deferReply({ ephemeral: true });
    const deleted = await interaction.channel.bulkDelete(count, true).catch(() => 0);
    await botLog("info", `${interaction.user.tag} a purgé ${deleted} messages dans #${interaction.channel.name}`);
    await interaction.editReply(`🧹 ${deleted} messages supprimés.`);
  },
};
