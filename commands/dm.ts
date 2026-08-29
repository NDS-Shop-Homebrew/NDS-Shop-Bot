import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { recordOutgoing } from "../lib/dm.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Envoyer un MP à un utilisateur / DM a user")
    .addUserOption((o) => o.setName("user").setDescription("L'utilisateur").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Le message").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user")!;
    const message = interaction.options.getString("message")!;
    try {
      await recordOutgoing(interaction.client, target.id, message, { id: interaction.user.id, username: interaction.user.username });
      await botLog("info", `${interaction.user.tag} a envoyé un MP à ${target.username}`);
      await interaction.reply({ content: `✅ MP envoyé à ${target.username}.`, ephemeral: true });
    } catch (err) {
      await interaction.reply(`❌ Impossible d'envoyer un MP : ${(err as Error).message}`);
    }
  },
};
