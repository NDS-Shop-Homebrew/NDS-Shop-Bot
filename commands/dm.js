// /dm <user> <message> — réponse directe en MP (traçée)
const { SlashCommandBuilder } = require("discord.js");
const { recordOutgoing } = require("../lib/dm");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Envoyer un MP à un utilisateur / DM a user")
    .addUserOption((o) => o.setName("user").setDescription("L'utilisateur").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Le message").setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message");
    try {
      await recordOutgoing(interaction.client, target.id, message, { id: interaction.user.id, username: interaction.user.username });
      await botLog("info", `${interaction.user.tag} a envoyé un MP à ${target.username}`);
      await interaction.reply({ content: `✅ MP envoyé à ${target.username}.`, ephemeral: true });
    } catch (err) {
      await interaction.reply(`❌ Impossible d'envoyer un MP : ${err.message}`);
    }
  },
};
