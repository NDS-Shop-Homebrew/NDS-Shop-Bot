// /favorites — favoris de jeux (BDD UserProfile)
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { listGames } = require("../lib/api");
const prisma = require("../lib/db");
const { T, detectLang } = require("../lib/lang");

function parse(arr) {
  try {
    return JSON.parse(arr || "[]");
  } catch {
    return [];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("favorites")
    .setDescription("Gérer vos favoris / Manage your favorites")
    .addSubcommand((s) => s.setName("list").setDescription("Voir vos favoris"))
    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Ajouter un jeu aux favoris")
        .addStringOption((o) => o.setName("game").setDescription("Nom du jeu").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Retirer un jeu des favoris")
        .addStringOption((o) => o.setName("game").setDescription("Nom du jeu").setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction, games) {
    const input = interaction.options.getFocused().toLowerCase();
    const matches = games.filter((g) => g.title.toLowerCase().includes(input)).slice(0, 25);
    await interaction.respond(matches.map((g) => ({ name: g.title.slice(0, 100), value: g.title.slice(0, 100) })));
  },

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const sub = interaction.options.getSubcommand();
    const user = interaction.user;

    if (sub === "list") {
      const p = await prisma.userProfile.findUnique({ where: { discordId: user.id } });
      const favs = parse(p?.favorites);
      if (!favs.length) {
        return interaction.reply(lang === "fr" ? "Aucun favori. Utilisez /favorites add <jeu>" : "No favorites. Use /favorites add <game>");
      }
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("⭐ Favoris")
        .setDescription(favs.map((f) => `• ${f}`).join("\n"));
      return interaction.reply({ embeds: [embed] });
    }

    const game = interaction.options.getString("game");
    const games = await listGames();
    const g = games.find((x) => x.title.toLowerCase() === game.toLowerCase()) || games.find((x) => x.title.toLowerCase().includes(game.toLowerCase()));
    if (!g) return interaction.reply(t.gameNotFound(game));

    const p = await prisma.userProfile.upsert({
      where: { discordId: user.id },
      update: {},
      create: { discordId: user.id, xp: 0, level: 1, totalMsgs: 0 },
    });
    let favs = parse(p.favorites);

    if (sub === "add") {
      if (favs.includes(g.title)) return interaction.reply(`${g.title} est déjà en favori.`);
      favs.push(g.title);
    } else {
      if (!favs.includes(g.title)) return interaction.reply(`${g.title} n'est pas en favori.`);
      favs = favs.filter((f) => f !== g.title);
    }
    await prisma.userProfile.update({ where: { discordId: user.id }, data: { favorites: JSON.stringify(favs) } });
    await interaction.reply(`${sub === "add" ? "⭐ Ajouté" : "🗑️ Retiré"} : **${g.title}**`);
  },
};
