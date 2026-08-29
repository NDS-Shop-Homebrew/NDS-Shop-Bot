import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder().setName("lock").setDescription("Verrouiller le salon / Lock the channel"),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as import("discord.js").TextChannel;
    await channel.permissionOverwrites.create(interaction.guild!.roles.everyone, {
      SendMessages: false,
    });
    await botLog("info", `${interaction.user.tag} a verrouillé #${channel.name}`);
    await interaction.reply("🔒 Salon verrouillé.");
  },
};
