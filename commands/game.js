const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { listGames } = require("../lib/api");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("game")
    .setDescription("Rechercher un jeu par nom / Search a game by name")
    .addStringOption((o) =>
      o.setName("query").setDescription("Nom du jeu").setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction, games) {
    const input = interaction.options.getFocused().toLowerCase();
    const matches = games.filter((g) => g.title.toLowerCase().includes(input)).slice(0, 25);
    await interaction.respond(matches.map((g) => ({ name: g.title.slice(0, 100), value: g.title.slice(0, 100) })));
  },

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const query = interaction.options.getString("query").toLowerCase();
    await interaction.deferReply();

    try {
      const games = await listGames();
      // Meilleur match : titre exact, puis partiel
      let match = games.find((g) => g.title.toLowerCase() === query) ||
                  games.find((g) => g.title.toLowerCase().includes(query));
      const allMatches = games.filter((g) => g.title.toLowerCase().includes(query) || (g.author || "").toLowerCase().includes(query));

      if (!match && allMatches.length) match = allMatches[0];
      if (!match) return interaction.editReply(t.gameNotFound(query));

      const g = match;
      const boxart = g.screenshots?.find((s) => s.description === "Boxart")?.url;

      const embed = new EmbedBuilder()
        .setColor("#0072CE")
        .setTitle(g.title)
        .setURL(`https://db-nds-shop.fr/game/${g.fileName}`)
        .setThumbnail(g.icon || null)
        .setImage(boxart || null)
        .addFields(
          { name: t.author, value: g.author || t.unknown, inline: true },
          { name: t.version, value: g.version || t.unknown, inline: true },
          { name: t.systemsField, value: (g.systems || []).join(", ") || t.unknown, inline: true },
          { name: "⬇️ " + t.downloads, value: Object.keys(g.downloads || {}).join("\n") || t.unknown, inline: false }
        )
        .setFooter({ text: `NDS-Shop · ${allMatches.length === 1 ? "Résultat unique" : `${allMatches.length} résultats`}` });

      const row = new ActionRowBuilder().addButtons(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setURL(`https://db-nds-shop.fr/game/${g.fileName}`)
          .setLabel("Voir sur le site"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("nope")
          .setLabel(`${allMatches.length} résultat(s)`)
          .setDisabled(true)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};