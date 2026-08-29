import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { reloadMatrix } from "../lib/permissions.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder().setName("reload").setDescription("Recharger la config (permissions) / Reload config"),
  async execute(interaction: ChatInputCommandInteraction) {
    await reloadMatrix();
    await botLog("info", `${interaction.user.tag} a rechargé la config`);
    await interaction.reply({ content: "✅ Configuration rechargée.", ephemeral: true });
  },
};