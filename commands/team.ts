import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { teamIds, presence } from "../lib/api.ts";
import { T, detectLang } from "../lib/lang.ts";

const STATUS_EMOJI: Record<string, string> = { online: "🟢", idle: "🟡", dnd: "🔴", offline: "⚫" };

export default {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("L'équipe du projet / The project team"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    await interaction.deferReply();

    try {
      const { members } = await teamIds();
      if (!members || !members.length) {
        return interaction.editReply(t.teamEmpty);
      }
      const rows: string[] = [];
      for (const m of members) {
        const id = m.id;
        try {
          const p = await presence(id);
          const status = STATUS_EMOJI[p.discord_status as keyof typeof STATUS_EMOJI] || STATUS_EMOJI.offline;
          rows.push(`${status} <@${id}>${m.role ? ` — ${m.role}` : ""} · ${t.status[p.discord_status as keyof typeof t.status] || t.status.offline}`);
        } catch {
          rows.push(`${STATUS_EMOJI.offline} <@${id}>${m.role ? ` — ${m.role}` : ""} · ${t.status.offline}`);
        }
      }
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("👥 " + t.teamTitle)
        .setDescription(rows.join("\n"))
        .setThumbnail("https://cdn.discordapp.com/icons/1271186486070345843/a_2dae567138c699e5b3b7046db9545ced.png")
        .setFooter({ text: "NDS-Shop" });
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply(t.error);
    }
  },
};