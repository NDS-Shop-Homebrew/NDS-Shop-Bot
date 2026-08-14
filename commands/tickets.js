// /tickets list|close|reopen — gestion des tickets (staff)
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const prisma = require("../lib/db");
const { closeTicket } = require("../lib/tickets");
const { botLog } = require("../lib/botLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Gérer les tickets / Manage tickets")
    .addSubcommand((s) => s.setName("list").setDescription("Lister les tickets ouverts"))
    .addSubcommand((s) => s.setName("close").setDescription("Fermer un ticket").addStringOption((o) => o.setName("id").setDescription("ID du ticket")))
    .addSubcommand((s) => s.setName("reopen").setDescription("Rouvrir un ticket").addStringOption((o) => o.setName("id").setDescription("ID du ticket"))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const lang = interaction.member?.roles?.cache?.some((r) => r.name === "English") ? "en" : "fr";

    if (sub === "list") {
      const open = await prisma.ticket.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" } });
      if (!open.length) {
        return interaction.reply(lang === "fr" ? "Aucun ticket ouvert." : "No open tickets.");
      }
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(lang === "fr" ? "🎫 Tickets ouverts" : "🎫 Open tickets")
        .setDescription(
          open
            .map((tk) => `**${tk.category}** — <@${tk.userId}> (${tk.username}) — \`${tk.id}\``)
            .join("\n")
        );
      return interaction.reply({ embeds: [embed] });
    }

    const id = interaction.options.getString("id");
    if (!id) return interaction.reply("Utilisez : /tickets list pour voir les IDs.");
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return interaction.reply("Ticket introuvable.");

    if (sub === "close") {
      await closeTicket(interaction.client, id, interaction.user.username);
      await botLog("info", `${interaction.user.tag} a fermé le ticket ${id}`);
      return interaction.reply(`🔒 Ticket ${id} fermé.`);
    }
    if (sub === "reopen") {
      await prisma.ticket.update({ where: { id }, data: { status: "open", closedAt: null } });
      await interaction.reply(`🔓 Ticket ${id} rouvert.`);
    }
  },
};
