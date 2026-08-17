import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { botLog } from "../lib/botLog.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Supprimer des messages / Bulk delete messages")
    .addIntegerOption((o) => o.setName("count").setDescription("Nombre de messages").setRequired(true).setMinValue(1).setMaxValue(100)),

  async execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger("count")!;
    const channel = interaction.channel as import("discord.js").TextChannel;
    await interaction.deferReply({ ephemeral: true });
    const deleted = await channel.bulkDelete(count, true).catch(() => 0);
    await botLog("info", `${interaction.user.tag} a purgé ${deleted} messages dans #${channel.name}`);
    await interaction.editReply(`🧹 ${deleted} messages supprimés.`);
  },
};
