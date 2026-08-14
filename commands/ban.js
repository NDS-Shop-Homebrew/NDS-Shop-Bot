// /ban /unban — modération
const { SlashCommandBuilder } = require("discord.js");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre / Ban a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Raison")),
  async execute(interaction) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "Aucune raison";
    if (!target) return interaction.reply("Utilisateur introuvable.");
    if (!target.bannable) return interaction.reply("Impossible de bannir ce membre.");
    await target.ban({ reason });
    await botLog("warn", `${interaction.user.tag} a ban ${target.user.username}: ${reason}`);
    await interaction.reply({ content: `🔨 ${target.user.username} banni.`, ephemeral: true });
  },
};
