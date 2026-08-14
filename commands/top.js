// /top — jeux les plus populaires (favoris du serveur)
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const prisma = require("../lib/db");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("Jeux les plus populaires / Most popular games"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const profiles = await prisma.userProfile.findMany({ select: { favorites: true } });
    const counts = {};
    for (const p of profiles) {
      try {
        const favs = JSON.parse(p.favorites || "[]");
        for (const f of favs) counts[f] = (counts[f] || 0) + 1;
      } catch {}
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!top.length) {
      return interaction.reply(lang === "fr" ? "Personne n'a encore de favoris. Lancez-vous : /favorites add <jeu> !" : "No favorites yet. Start now: /favorites add <game>!");
    }
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(lang === "fr" ? "🔥 Jeux populaires" : "🔥 Popular games")
      .setDescription(top.map(([g, n], i) => `${i + 1}. **${g}** — ${n} favori${n > 1 ? "s" : ""}`).join("\n"));
    await interaction.reply({ embeds: [embed] });
  },
};
