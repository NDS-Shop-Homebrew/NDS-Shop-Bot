import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { GUILD_ID } from "../config.ts";
import { botLog } from "../lib/botLog.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Envoyer un embed / Send an embed")
    .addStringOption((o) => o.setName("channel").setDescription("Nom du salon").setRequired(true))
    .addStringOption((o) => o.setName("title").setDescription("Titre").setRequired(true))
    .addStringOption((o) => o.setName("description").setDescription("Description").setRequired(true))
    .addStringOption((o) => o.setName("color").setDescription("Couleur hex (ex: 0072CE)")),

  async execute(interaction: ChatInputCommandInteraction) {
    const channelName = interaction.options.getString("channel")!.replace(/^#/, "").toLowerCase();
    const title = interaction.options.getString("title")!;
    const desc = interaction.options.getString("description")!;
    const color = interaction.options.getString("color") || "0072CE";
    const guild = interaction.client.guilds.cache.get(GUILD_ID);
    const channel = guild?.channels.cache.find((c) => c.name.toLowerCase() === channelName && c.isTextBased()) as import("discord.js").TextChannel | undefined;
    if (!channel) return interaction.reply(`Salon #${channelName} introuvable.`);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor(parseInt(color.replace("#", ""), 16) || 0x0072ce)
      .setFooter({ text: interaction.user.username })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    await botLog("info", `${interaction.user.tag} a envoyé un embed dans #${channel.name}`);
    await interaction.reply({ content: "✅ Embed envoyé.", ephemeral: true });
  },
};
