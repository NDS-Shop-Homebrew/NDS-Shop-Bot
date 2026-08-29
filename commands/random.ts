import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { listGames } from "../lib/api.js";
import { API_BASE_URL } from "../config.js";
import { T, detectLang } from "../lib/lang.js";

export default {
  data: new SlashCommandBuilder()
    .setName("random")
    .setDescription("Jeu au hasard / Random game"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const games = await listGames();
      const g = games[Math.floor(Math.random() * games.length)];
      const boxart = g.screenshots?.find((s) => s.description === "Boxart")?.url;

      const embed = new EmbedBuilder()
        .setColor("#0072CE")
        .setTitle(`🎮 ${g.title}`)
        .setURL(`${API_BASE_URL}/game/${g.fileName}`)
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
