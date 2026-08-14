// /help — liste des commandes
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Aide / Help"),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const fr = [
      "`/serial <id>` — fiche d'un jeu par serial",
      "`/game <nom>` — recherche un jeu (autocomplétion)",
      "`/download <jeu>` — liens .nds/.cia/QR (autocomplétion)",
      "`/random` — jeu au hasard",
      "`/stats` — statistiques du catalogue",
      "`/team` — l'équipe du projet",
      "`/suggest` — proposer une suggestion",
      "`/report` — signaler un bug",
      "`/invite` — liens utiles",
      "`/ping` — latence du bot",
    ];
    const en = [
      "`/serial <id>` — game info by serial",
      "`/game <name>` — search a game (autocomplete)",
      "`/download <game>` — .nds/.cia/QR links (autocomplete)",
      "`/random` — random game",
      "`/stats` — catalog stats",
      "`/team` — the project team",
      "`/suggest` — make a suggestion",
      "`/report` — report a bug",
      "`/invite` — useful links",
      "`/ping` — bot latency",
    ];
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(t.helpTitle)
      .setDescription((lang === "fr" ? fr : en).join("\n"))
      .setFooter({ text: "https://db-nds-shop.fr" });
    await interaction.reply({ embeds: [embed] });
  },
};
