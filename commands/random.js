// /random — un jeu au hasard
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { listGames } = require("../lib/api");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("random")
    .setDescription("Jeu au hasard / Random game"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const games = await listGames();
      const g = games[Math.floor(Math.random() * games.length)];
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(g.title)
        .setURL(`https://db-nds-shop.fr/game/${g.fileName}`)
        .setThumbnail(g.icon || null)
        .addFields(
          { name: t.author, value: g.author || t.unknown, inline: true },
          { name: t.version, value: g.version || t.unknown, inline: true },
          { name: t.systemsField, value: (g.systems || []).join(", ") || t.unknown, inline: true }
        )
        .setFooter({ text: t.randomTitle });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};
