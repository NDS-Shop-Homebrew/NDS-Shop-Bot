// /lock /unlock — verrouille/déverrouille le salon courant
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder().setName("lock").setDescription("Verrouiller le salon / Lock the channel"),
  async execute(interaction) {
    await interaction.channel.permissionOverwrites.create(interaction.guild.roles.everyone, {
      SendMessages: false,
    });
    await botLog("info", `${interaction.user.tag} a verrouillé #${interaction.channel.name}`);
    await interaction.reply("🔒 Salon verrouillé.");
  },
};
