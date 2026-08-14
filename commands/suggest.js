// /suggest <message> — poste une suggestion dans #suggestions
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { CHANNELS } = require("../config");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Proposer une suggestion / Suggest something")
    .addStringOption((o) =>
      o.setName("message").setDescription("Votre suggestion").setRequired(true)
    ),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const text = interaction.options.getString("message");
    const channel = interaction.guild.channels.cache.find(
      (c) => c.name === CHANNELS.suggestions && c.isTextBased()
    );

    const embed = new EmbedBuilder()
      .setColor("#F1C40F")
      .setTitle(t.suggestTitle)
      .setDescription(text)
      .setFooter({ text: `${t.byUser} ${interaction.user.username}` })
      .setTimestamp();

    if (channel) {
      const msg = await channel.send({ embeds: [embed] });
      await msg.react("✅").catch(() => {});
      await msg.react("❌").catch(() => {});
      await interaction.reply({ content: t.suggestSent, ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  },
};
