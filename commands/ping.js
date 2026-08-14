// /ping — latence
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Ping / Pong"),

  async execute(interaction) {
    const sent = await interaction.reply({ content: "Pong!", fetchReply: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! 🏓 Latence: ${rtt}ms | API: ${Math.round(interaction.client.ws.ping)}ms`);
  },
};
