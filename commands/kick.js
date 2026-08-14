// /kick /ban /unban /mute /unmute — modération
const { SlashCommandBuilder } = require("discord.js");
const { botLog } = require("../lib/botLog");

const base = (name, desc) => new SlashCommandBuilder().setName(name).setDescription(desc);

module.exports = {
  data: base("kick", "Éjecter un membre / Kick a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Raison")),
  async execute(interaction) {
    const target = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "Aucune raison";
    if (!target) return interaction.reply("Utilisateur introuvable.");
    if (!target.kickable) return interaction.reply("Impossible d'éjecter ce membre.");
    await target.kick(reason);
    await botLog("warn", `${interaction.user.tag} a kick ${target.user.username}: ${reason}`);
    await interaction.reply({ content: `👢 ${target.user.username} éjecté.`, ephemeral: true });
  },
};
