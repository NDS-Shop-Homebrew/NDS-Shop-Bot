// /help — liste des commandes (groupées)
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Aide / Help"),

  async execute(interaction) {
    const fr = interaction.member?.roles?.cache?.some((r) => r.name === "English") ? false : true;
    const groups = fr
      ? [
          ["🎮 Jeux", "`/game` `/serial` `/download` `/random` `/top`"],
          ["📊 Infos", "`/stats` `/team` `/profile` `/rank` `/leaderboard`"],
          ["⭐ Personnel", "`/favorites` `/watch` `/remind`"],
          ["🎫 Support", "`/suggest` `/report` — ou écrivez-moi en MP pour ouvrir un ticket"],
          ["🔗 Divers", "`/invite` `/ping` `/help`"],
        ]
      : [
          ["🎮 Games", "`/game` `/serial` `/download` `/random` `/top`"],
          ["📊 Info", "`/stats` `/team` `/profile` `/rank` `/leaderboard`"],
          ["⭐ Personal", "`/favorites` `/watch` `/remind`"],
          ["🎫 Support", "`/suggest` `/report` — or DM me to open a ticket"],
          ["🔗 Misc", "`/invite` `/ping` `/help`"],
        ];
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(fr ? "Commandes NDS-Shop" : "NDS-Shop commands")
      .setDescription(groups.map(([h, c]) => `**${h}**\n${c}`).join("\n\n"))
      .setFooter({ text: "https://db-nds-shop.fr" });
    await interaction.reply({ embeds: [embed] });
  },
};
