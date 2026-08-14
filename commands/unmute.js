// /unmute — retire le rôle Muted
const { SlashCommandBuilder } = require("discord.js");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute un membre / Unmute a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getMember("user");
    const mutedRole = interaction.guild.roles.cache.find((r) => r.name === "Muted");
    if (mutedRole) await target.roles.remove(mutedRole);
    await botLog("info", `${interaction.user.tag} a unmute ${target.user.username}`);
    await interaction.reply({ content: `🔊 ${target.user.username} démuté.`, ephemeral: true });
  },
};
