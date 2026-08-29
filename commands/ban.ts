import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre / Ban a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Raison")),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason") || "Aucune raison";
    if (!target) return interaction.reply("Utilisateur introuvable.");
    if (!target.bannable) return interaction.reply("Impossible de bannir ce membre.");
    await target.ban({ reason });
    await botLog("warn", `${interaction.user.tag} a ban ${target.user.username}: ${reason}`);
    await interaction.reply({ content: `🔨 ${target.user.username} banni.`, ephemeral: true });
  },
};
