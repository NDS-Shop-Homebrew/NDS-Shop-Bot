// /serial <serial> — fiche enrichie d'un jeu depuis ndsdb
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { metadata } = require("../lib/api");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serial")
    .setDescription("Rechercher un jeu par serial (ex: A2DP) / Look up a game by serial")
    .addStringOption((o) =>
      o.setName("serial").setDescription("Serial du jeu (ex: A2DP)").setRequired(true)
    ),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const serial = interaction.options.getString("serial").toUpperCase().trim();
    await interaction.deferReply();

    try {
      const game = await metadata(serial);
      const desc =
        game.description_igdb ||
        game[lang === "fr" ? "description_fr" : "description_en"] ||
        game.description ||
        t.noDescription;

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(game.name || game.formal_name || serial)
        .setURL(`https://db-nds-shop.fr/game-list`)
        .setDescription(desc.slice(0, 900))
        .setThumbnail(game.media?.icon || null)
        .addFields(
          { name: t.serial, value: game.product_code || serial, inline: true },
          { name: t.region, value: game.region || t.unknown, inline: true },
          { name: t.developer, value: game.developer || t.unknown, inline: true },
          { name: t.publisher, value: game.publisher || t.unknown, inline: true },
          { name: t.release, value: game.release_date || t.unknown, inline: true },
          { name: t.genres, value: (game.genres || []).join(", ") || t.unknown, inline: true },
          ...(game.rating_system?.name
            ? [{ name: t.rating, value: `${game.rating_system.name} ${game.rating_system.age}+`, inline: true }]
            : [])
        );

      const shot = game.media?.front_boxart || game.media?.screenshots?.compiled?.[0];
      if (shot) embed.setImage(shot);

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.serialNotFound(serial));
    }
  },
};
