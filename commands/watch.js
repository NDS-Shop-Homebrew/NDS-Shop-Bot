// /watch — notifications quand un jeu est mis à jour
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { listGames } = require("../lib/api");
const prisma = require("../lib/db");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("watch")
    .setDescription("Être notifié quand un jeu est mis à jour / Get notified when a game updates")
    .addStringOption((o) => o.setName("game").setDescription("Nom du jeu").setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction, games) {
    const input = interaction.options.getFocused().toLowerCase();
    const matches = games.filter((g) => g.title.toLowerCase().includes(input)).slice(0, 25);
    await interaction.respond(matches.map((g) => ({ name: g.title.slice(0, 100), value: g.title.slice(0, 100) })));
  },

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const game = interaction.options.getString("game");
    const games = await listGames();
    const g = games.find((x) => x.title.toLowerCase() === game.toLowerCase()) || games.find((x) => x.title.toLowerCase().includes(game.toLowerCase()));
    if (!g) return interaction.reply(t.gameNotFound(game));

    const row = await prisma.gameSub.upsert({
      where: { discordId: interaction.user.id },
      update: {},
      create: { discordId: interaction.user.id, games: "[]" },
    });
    const watched = JSON.parse(row.games || "[]");
    if (!watched.includes(g.title)) {
      watched.push(g.title);
      await prisma.gameSub.update({ where: { discordId: interaction.user.id }, data: { games: JSON.stringify(watched) } });
      await interaction.reply(`🔔 Vous serez notifié quand **${g.title}** sera mis à jour.`);
    } else {
      const next = watched.filter((x) => x !== g.title);
      await prisma.gameSub.update({ where: { discordId: interaction.user.id }, data: { games: JSON.stringify(next) } });
      await interaction.reply(`🔕 Notifications désactivées pour **${g.title}**.`);
    }
  },
};
