import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { T, detectLang } from "../lib/lang.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Liens utiles / Useful links"),

  async execute(interaction: ChatInputCommandInteraction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("NDS-Shop")
      .setDescription(
        (lang === "fr"
          ? "**Site** : https://db-nds-shop.fr\n**Télécharger l'app** : https://db-nds-shop.fr/d\n**GitHub** : https://github.com/NDS-Shop-Homebrew"
          : "**Website**: https://db-nds-shop.fr\n**Download the app**: https://db-nds-shop.fr/d\n**GitHub**: https://github.com/NDS-Shop-Homebrew") +
          "\n**Discord** : https://discord.gg/udw7Z4mdKJ"
      );
    await interaction.reply({ embeds: [embed] });
  },
};
