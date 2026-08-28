import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, type AutocompleteInteraction } from "discord.js";
import { listGames } from "../lib/api.ts";
import { API_BASE_URL } from "../config.ts";
import { T, detectLang } from "../lib/lang.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("download")
    .setDescription("Télécharger un jeu / Download a game")
    .addStringOption((o) =>
      o.setName("game").setDescription("Nom du jeu").setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction, games: { title: string }[]) {
    const input = interaction.options.getFocused().toLowerCase();
    const matches = games.filter((g) => g.title.toLowerCase().includes(input)).slice(0, 25);
    await interaction.respond(matches.map((g) => ({ name: g.title.slice(0, 100), value: g.title.slice(0, 100) })));
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const query = interaction.options.getString("game")!.toLowerCase();
    await interaction.deferReply();

    try {
      const games = await listGames();
      const g = games.find((x) => x.title.toLowerCase() === query) ||
        games.find((x) => x.title.toLowerCase().includes(query));
      if (!g) return interaction.editReply(t.gameNotFound(query));

      const dl = g.downloads || {};
      const boxart = g.screenshots?.find((s) => s.description === "Boxart")?.url;
      const qrUrl = (g.qr && Object.values(g.qr)[0]) || null;

      const embed = new EmbedBuilder()
        .setColor("#0072CE")
        .setTitle(`🕹️ ${g.title}`)
.setURL(`${API_BASE_URL}/game/${g.fileName}`)
        .setThumbnail(g.icon || null)
        .setImage(qrUrl || boxart || null)
        .setDescription(
          Object.entries(dl)
            .map(([name, d]) => {
              const ext = name.includes(".cia") ? "CIA" : name.includes(".dsi") ? "DSi" : "NDS";
              return `**[${ext}] ${name}**\n${d.url}`;
            })
            .join("\n\n") || t.unknown
        )
        .addFields(
          { name: t.author, value: g.author || t.unknown, inline: true },
          { name: t.version, value: g.version || t.unknown, inline: true },
          { name: t.systemsField, value: (g.systems || []).join(", ") || t.unknown, inline: true }
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`${API_BASE_URL}/game/${g.fileName}`).setLabel(t.viewGame)
      );

      await interaction.editReply({ embeds: [embed], components: qrUrl ? [row] : [] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};
