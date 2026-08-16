// Tickets / MP : menu en DM, création d'un thread dans 🎫 TICKETS, relais bidirectionnel.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const prisma = require("./db");
const { botLog } = require("./botLog");

const CATEGORIES = ["Support", "Bug", "Suggestion", "Recrutement"];
const TICKETS_CATEGORY = "🎫 TICKETS";

function menuRow() {
  return new ActionRowBuilder().addButtons(
    CATEGORIES.map((c) =>
      new ButtonBuilder()
        .setCustomId(`ticket_${c.toLowerCase()}`)
        .setLabel(c)
        .setStyle(c === "Bug" ? ButtonStyle.Danger : c === "Suggestion" ? ButtonStyle.Primary : c === "Recrutement" ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );
}

// Envoie le menu de choix de ticket en DM
async function sendTicketMenu(user) {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎫 NDS-Shop Support")
    .setDescription(
      "Choisissez une catégorie pour ouvrir un ticket. Un membre de l'équipe vous répondra ici.\n\n" +
        "Pick a category to open a ticket. A team member will answer you here."
    );
  await user.send({ embeds: [embed], components: [menuRow()] });
}

// Crée un ticket : enregistrement BDD + thread dans la catégorie 🎫 TICKETS
async function createTicket(client, user, category) {
  const cfg = require("./config");
  const guild = client?.guilds?.cache.get(cfg.GUILD_ID);
  const cat = guild?.channels.cache.find((c) => c.name === TICKETS_CATEGORY && c.type === 4);
  if (!cat) {
    await botLog("error", `Catégorie ${TICKETS_CATEGORY} introuvable`);
    return null;
  }

  const ticket = await prisma.ticket.create({
    data: { userId: user.id, username: user.username, category, status: "open" },
  });

  const thread = await cat.children.create({
    name: `${category.toLowerCase()}-${user.username.replace(/[^a-z0-9_-]/gi, "").slice(0, 20) || "user"}`,
    type: 0,
    permissionOverwrites: [],
  });
  await thread.permissionOverwrites.set(cat.permissionOverwrites);
  await thread.permissionOverwrites.create(guild.roles.everyone, { ViewChannel: false });
  const staffRoles = ["Admin", "Moderator", "Developer", "Tester"];
  for (const rn of staffRoles) {
    const r = guild.roles.cache.find((r2) => r2.name === rn);
    if (r) await thread.permissionOverwrites.create(r, { ViewChannel: true });
  }

  await prisma.ticket.update({ where: { id: ticket.id }, data: { threadId: thread.id } });

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🎫 ${category}`)
        .setDescription(`Ticket ouvert par <@${user.id}> (**${user.username}**)\n\nRépondez ici, les réponses seront envoyées en DM à l'utilisateur.`)
        .setFooter({ text: `ID: ${ticket.id}` }),
    ],
  });

  // Log dans #log-tickets
  try {
    const logCh = guild?.channels.cache.find((c) => c.name === cfg.CHANNELS.logTickets && c.isTextBased());
    if (logCh) await logCh.send(`🆕 **${category}** — <@${user.id}> (${user.username}) — \`${ticket.id}\``);
  } catch {}

  await botLog("info", `Ticket ${category} ouvert par ${user.username}`);
  return ticket;
}

// Relais : message entrant (DM user OU thread staff) -> enregistré + transmis
async function relayMessage(client, channel, author, content, fromUser) {
  try {
    // fromUser=true : le message vient du DM du user -> direction "user", cible = thread
    // fromUser=false : le message vient du thread (staff) -> direction "staff", cible = DM
    const ticket = fromUser
      ? await prisma.ticket.findFirst({ where: { userId: author.id, status: "open" } })
      : await prisma.ticket.findFirst({ where: { threadId: channel.id, status: "open" } });
    if (!ticket) return false;

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: author.id,
        author: author.username,
        content: String(content).slice(0, 1900),
        direction: fromUser ? "user" : "staff",
      },
    });

    if (fromUser) {
      // DM user -> thread staff
      const guild = client.guilds.cache.get(require("./config").GUILD_ID);
      const thread = guild?.channels.cache.get(ticket.threadId);
      if (thread?.isTextBased()) {
        await thread.send(`**${author.username}** : ${content}`);
      }
    } else {
      // Thread staff -> DM user
      const user = await client.users.fetch(ticket.userId).catch(() => null);
      if (user) {
        await user.send(String(content));
      }
    }
    return true;
  } catch (err) {
    await botLog("error", `Relay: ${err.message}`);
    return false;
  }
}

// Ferme un ticket (depuis le thread ou le dashboard)
async function closeTicket(client, ticketId, by) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "closed", closedAt: new Date() },
  });
  const guild = client?.guilds?.cache.get(require("./config").GUILD_ID);
  const thread = guild?.channels?.cache.get(ticket.threadId);
  if (thread) {
    await thread.permissionOverwrites.create(guild.roles.everyone, { ViewChannel: false });
    await thread.send(`🔒 Ticket fermé par ${by || "staff"}.`);
  }
  // Log dans #log-tickets
  try {
    const cfg = require("./config");
    const logCh = guild?.channels.cache.find((c) => c.name === cfg.CHANNELS.logTickets && c.isTextBased());
    if (logCh) await logCh.send(`🔒 **${ticket.category}** fermé par ${by} — <@${ticket.userId}> (\`${ticketId}\`)`);
  } catch {}
  // Notifie l'utilisateur
  const user = await client?.users?.fetch(ticket.userId).catch(() => null);
  if (user) await user.send(`🔒 Votre ticket **${ticket.category}** a été fermé. Merci !`);
  await botLog("info", `Ticket ${ticketId} fermé`);
  return ticket;
}

module.exports = { CATEGORIES, TICKETS_CATEGORY, sendTicketMenu, createTicket, relayMessage, closeTicket, menuRow };
