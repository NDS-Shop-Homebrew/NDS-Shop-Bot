// /unban <userid> — débannir
const { SlashCommandBuilder } = require("discord.js");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Débannir un utilisateur / Unban a user")
    .addStringOption((o) => o.setName("userid").setDescription("ID de l'utilisateur").setRequired(true)),
  async execute(interaction) {
    const id = interaction.options.getString("userid");
    try {
      await interaction.guild.members.unban(id);
      await botLog("info", `${interaction.user.tag} a débanni ${id}`);
      await interaction.reply({ content: `✅ Utilisateur ${id} débanni.`, ephemeral: true });
    } catch {
      await interaction.reply("Impossible de débannir cet utilisateur.");
    }
  },
};
