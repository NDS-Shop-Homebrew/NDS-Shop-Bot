// /random — jeu aléatoire avec boxart et lien
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
      const boxart = g.screenshots?.find((s) => s.description === "Boxart")?.url;

      const embed = new EmbedBuilder()
        .setColor("#0072CE")
        .setTitle(`🎲 ${g.title}`)
        .setURL(`https://db-nds-shop.fr/game/${g.fileName}`)
        .setThumbnail(g.icon || null)
        .addFields(
          { name: t.author, value: g.author || t.unknown, inline: true },
          { name: t.version, value: g.version || t.unknown, inline: true },
          { name: t.systemsField, value: (g.systems || []).join(", ") || t.unknown, inline: true }
        )
        .setImage(boxart || null)
        .setFooter({ text: t.randomTitle });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};