// /reload — recharge la matrice de permissions et les commandes (admin)
const { SlashCommandBuilder } = require("discord.js");
const { reloadMatrix } = require("../lib/permissions");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder().setName("reload").setDescription("Recharger la config (permissions) / Reload config"),
  async execute(interaction) {
    await reloadMatrix();
    await botLog("info", `${interaction.user.tag} a rechargé la config`);
    await interaction.reply({ content: "✅ Configuration rechargée.", ephemeral: true });
  },
};
