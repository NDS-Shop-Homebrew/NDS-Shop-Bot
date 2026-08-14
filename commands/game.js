// /game <query> — autocomplete + recherche un jeu dans games.json
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { listGames } = require("../lib/api");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("game")
    .setDescription("Rechercher un jeu par nom / Search a game by name")
    .addStringOption((o) =>
      o
        .setName("query")
        .setDescription("Nom du jeu")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction, games) {
    const input = interaction.options.getFocused().toLowerCase();
    const matches = games
      .filter(
        (g) =>
          g.title.toLowerCase().includes(input) ||
          (g.author || "").toLowerCase().includes(input)
      )
      .slice(0, 25);
    await interaction.respond(
      matches.map((g) => ({ name: g.title.slice(0, 100), value: g.title.slice(0, 100) }))
    );
  },

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const query = interaction.options.getString("query").toLowerCase();
    await interaction.deferReply();

    try {
      const games = await listGames();
      const matches = games.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          (g.author || "").toLowerCase().includes(query)
      );
      if (!matches.length) return interaction.editReply(t.gameNotFound(query));

      const top = matches.slice(0, 5);
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(t.games)
        .setDescription(
          top
            .map(
              (g, i) =>
                `${i + 1}. **${g.title}** — ${g.author || t.unknown} (_${g.version}_)\n${g.icon}`
            )
            .join("\n\n")
        );

      if (matches.length > 5) {
        embed.setFooter({ text: t.moreResults(matches.length - 5) });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};
