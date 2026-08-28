import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { detectLang } from "../lib/lang.ts";
import { API_BASE_URL } from "../config.ts";

export default {
  data: new SlashCommandBuilder().setName("help").setDescription("Aide / Help"),

  async execute(interaction: ChatInputCommandInteraction) {
    const fr = detectLang(interaction.member) === "fr";
    const groups = fr
      ? [
          ["🎮 Jeux", "`/game` `/serial` `/download` `/random` `/top`"],
          ["📊 Infos", "`/stats` `/team` `/profile` `/rank` `/leaderboard`"],
          ["⭐ Personnel", "`/favorites` `/watch` `/remind`"],
          ["🎫 Support", "`/suggest` `/report` — ou écrivez-moi en MP pour ouvrir un ticket"],
          ["ℹ️ Divers", "`/invite` `/ping` `/help`"],
        ]
      : [
          ["🎮 Games", "`/game` `/serial` `/download` `/random` `/top`"],
          ["📊 Info", "`/stats` `/team` `/profile` `/rank` `/leaderboard`"],
          ["⭐ Personal", "`/favorites` `/watch` `/remind`"],
          ["🎫 Support", "`/suggest` `/report` — or DM me to open a ticket"],
          ["ℹ️ Misc", "`/invite` `/ping` `/help`"],
        ];
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(fr ? "Commandes NDS-Shop" : "NDS-Shop commands")
      .setDescription(groups.map(([h, c]) => `**${h}**\n${c}`).join("\n\n"))
      .setFooter({ text: API_BASE_URL });
    await interaction.reply({ embeds: [embed] });
  },
};
