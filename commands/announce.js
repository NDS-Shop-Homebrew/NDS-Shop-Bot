// /announce <salon> <markdown> — poste un message dans un salon
const { SlashCommandBuilder } = require("discord.js");
const { GUILD_ID } = require("../config");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Poster une annonce (markdown) / Post an announcement")
    .addStringOption((o) => o.setName("channel").setDescription("Nom du salon").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Contenu (markdown)").setRequired(true)),

  async execute(interaction) {
    const channelName = interaction.options.getString("channel").replace(/^#/, "").toLowerCase();
    const message = interaction.options.getString("message");
    const guild = interaction.client.guilds.cache.get(GUILD_ID);
    const channel = guild?.channels.cache.find((c) => c.name.toLowerCase() === channelName && c.isTextBased());
    if (!channel) return interaction.reply(`Salon #${channelName} introuvable.`);

    await channel.send({ content: message });
    await botLog("info", `${interaction.user.tag} a posté une annonce dans #${channel.name}`);
    await interaction.reply({ content: `✅ Annonce postée dans #${channel.name}.`, ephemeral: true });
  },
};
