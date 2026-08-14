// /report <message> — poste un rapport de bug dans #bug-reports
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { CHANNELS } = require("../config");
const { T, detectLang } = require("../lib/lang");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Signaler un bug / Report a bug")
    .addStringOption((o) =>
      o.setName("message").setDescription("Description du bug").setRequired(true)
    ),

  async execute(interaction) {
    const lang = detectLang(interaction.member);
    const t = T[lang];
    const text = interaction.options.getString("message");
    const channel = interaction.guild.channels.cache.find(
      (c) => c.name === CHANNELS.bugReports && c.isTextBased()
    );

    const embed = new EmbedBuilder()
      .setColor("#E74C3C")
      .setTitle(t.reportTitle)
      .setDescription(text)
      .setFooter({ text: `${t.byUser} ${interaction.user.username}` })
      .setTimestamp();

    if (channel) {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: t.reportSent, ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  },
};
