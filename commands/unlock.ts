import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder().setName("unlock").setDescription("Déverrouiller le salon / Unlock the channel"),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as import("discord.js").TextChannel;
    await channel.permissionOverwrites.create(interaction.guild!.roles.everyone, {
      SendMessages: true,
    });
    await botLog("info", `${interaction.user.tag} a déverrouillé #${channel.name}`);
    await interaction.reply("🔓 Salon déverrouillé.");
  },
};