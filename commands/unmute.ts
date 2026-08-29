import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute un membre / Unmute a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember("user") as GuildMember | null;
    const mutedRole = interaction.guild!.roles.cache.find((r) => r.name === "Muted");
    if (mutedRole) await target!.roles.remove(mutedRole);
    await botLog("info", `${interaction.user.tag} a unmute ${target!.user.username}`);
    await interaction.reply({ content: `🔊 ${target!.user.username} démuté.`, ephemeral: true });
  },
};