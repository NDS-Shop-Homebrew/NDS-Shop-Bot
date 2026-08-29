import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import { botLog } from "../lib/botLog.js";

const base = (name: string, desc: string) => new SlashCommandBuilder().setName(name).setDescription(desc);

export default {
  data: base("kick", "Éjecter un membre / Kick a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Raison")),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason") || "Aucune raison";
    if (!target) return interaction.reply("Utilisateur introuvable.");
    if (!target.kickable) return interaction.reply("Impossible d'éjecter ce membre.");
    await target.kick(reason);
    await botLog("warn", `${interaction.user.tag} a kick ${target.user.username}: ${reason}`);
    await interaction.reply({ content: `👢 ${target.user.username} éjecté.`, ephemeral: true });
  },
};
