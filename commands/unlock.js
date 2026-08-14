// /unlock — déverrouille le salon courant
const { SlashCommandBuilder } = require("discord.js");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder().setName("unlock").setDescription("Déverrouiller le salon / Unlock the channel"),
  async execute(interaction) {
    await interaction.channel.permissionOverwrites.create(interaction.guild.roles.everyone, {
      SendMessages: true,
    });
    await botLog("info", `${interaction.user.tag} a déverrouillé #${interaction.channel.name}`);
    await interaction.reply("🔓 Salon déverrouillé.");
  },
};
