import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../lib/db.ts";
import { T, detectLang } from "../lib/lang.ts";

function parse(arr: string | null | undefined): string[] {
  try { return JSON.parse(arr || "[]"); } catch { return []; }
}

export default {
  data: new SlashCommandBuilder().setName("profile").setDescription("Votre profil / Your profile"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const p = await prisma.userProfile.findUnique({ where: { discordId: interaction.user.id } });
    const favs = parse(p?.favorites);
    const watched = parse(p?.watched);

    const embed = new EmbedBuilder()
      .setColor("#0072CE")
      .setTitle(interaction.user.username)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: lang === "fr" ? "Niveau" : "Level", value: `**${p?.level || 1}**`, inline: true },
        { name: "XP", value: `${Number(p?.xp || 0)}`, inline: true },
        { name: lang === "fr" ? "Messages" : "Messages", value: `${p?.totalMsgs || 0}`, inline: true },
        { name: "⭐ " + (lang === "fr" ? "Favoris" : "Favorites"), value: favs.length ? favs.join(", ").slice(0, 800) : "—", inline: false },
        { name: "👁️ " + (lang === "fr" ? "Jeux suivis" : "Watched games"), value: watched.length ? watched.join(", ").slice(0, 400) : "—", inline: false }
      );
    await interaction.reply({ embeds: [embed] });
  },
};
