import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("Ping / Pong"),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: "Pong!", fetchReply: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! 🏓 Latence: ${rtt}ms | API: ${Math.round(interaction.client.ws.ping)}ms`);
  },
};
