import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
  type TextBasedChannel,
  type User,
} from "discord.js";
import prisma from "./db.js";
import { botLog } from "./botLog.js";
import { GUILD_ID, CHANNELS } from "../config.js";

export const CATEGORIES = ["Support", "Bug", "Suggestion", "Recrutement"];
export const TICKETS_CATEGORY = "🎫 TICKETS";

function menuRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    CATEGORIES.map((c) =>
      new ButtonBuilder()
        .setCustomId(`ticket_${c.toLowerCase()}`)
        .setLabel(c)
        .setStyle(c === "Bug" ? ButtonStyle.Danger : c === "Suggestion" ? ButtonStyle.Primary : c === "Recrutement" ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );
}

export async function sendTicketMenu(user: User) {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎫 NDS-Shop Support")
    .setDescription(
      "Choisissez une catégorie pour ouvrir un ticket. Un membre de l'équipe vous répondra ici.\n\n" +
        "Pick a category to open a ticket. A team member will answer you here."
    );
  await user.send({ embeds: [embed], components: [menuRow()] });
}

export async function createTicket(client: Client | null, user: User, category: string) {
  const guild = client?.guilds?.cache.get(GUILD_ID);
  const cat = guild?.channels.cache.find((c) => c.name === TICKETS_CATEGORY && c.type === 4) as import("discord.js").CategoryChannel | undefined;
  if (!cat) {
    await botLog("error", `Catégorie ${TICKETS_CATEGORY} introuvable`);
    return null;
  }

  const ticket = await prisma.botTicket.create({
    data: { userId: user.id, username: user.username, category, status: "open" },
  });

  const thread = (await cat.children.create({
    name: `${category.toLowerCase()}-${user.username.replace(/[^a-z0-9_-]/gi, "").slice(0, 20) || "user"}`,
    type: 0,
    permissionOverwrites: [],
  })) as import("discord.js").TextChannel;
  await thread.permissionOverwrites.set(cat.permissionOverwrites.cache);
  await thread.permissionOverwrites.create(guild!.roles.everyone, { ViewChannel: false });
  const staffRoles = ["Admin", "Moderator", "Developer", "Tester"];
  for (const rn of staffRoles) {
    const r = guild!.roles.cache.find((r2) => r2.name === rn);
    if (r) await thread.permissionOverwrites.create(r, { ViewChannel: true });
  }

  await prisma.botTicket.update({ where: { id: ticket.id }, data: { threadId: thread.id } });

  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🎫 ${category}`)
        .setDescription(`Ticket ouvert par <@${user.id}> (**${user.username}**)\n\nRépondez ici, les réponses seront envoyées en DM à l'utilisateur.`)
        .setFooter({ text: `ID: ${ticket.id}` }),
    ],
  });

  try {
    const logCh = guild?.channels.cache.find((c) => c.name === CHANNELS.logTickets && c.isTextBased()) as import("discord.js").TextChannel | undefined;
    if (logCh) await logCh.send(`🎫 **${category}** — <@${user.id}> (${user.username}) — \`${ticket.id}\``);
  } catch {}

  await botLog("info", `Ticket ${category} ouvert par ${user.username}`);
  return ticket;
}

export async function relayMessage(
  client: Client | null,
  channel: TextBasedChannel,
  author: User,
  content: string,
  fromUser: boolean
) {
  try {
    const ticket = fromUser
      ? await prisma.botTicket.findFirst({ where: { userId: author.id, status: "open" } })
      : await prisma.botTicket.findFirst({ where: { threadId: channel.id, status: "open" } });
    if (!ticket) return false;

    await prisma.botTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: author.id,
        author: author.username,
        content: String(content).slice(0, 1900),
        direction: fromUser ? "user" : "staff",
      },
    });

    if (fromUser) {
      const guild = client?.guilds.cache.get(GUILD_ID);
      const thread = guild?.channels.cache.get(ticket.threadId || "") as import("discord.js").TextChannel | undefined;
      if (thread) {
        await thread.send(`**${author.username}** : ${content}`);
      }
    } else {
      const user = await client?.users.fetch(ticket.userId).catch(() => null);
      if (user) {
        await user.send(String(content));
      }
    }
    return true;
  } catch (err) {
    await botLog("error", `Relay: ${(err as Error).message}`);
    return false;
  }
}

export async function closeTicket(client: Client | null, ticketId: string, by?: string) {
  const ticket = await prisma.botTicket.update({
    where: { id: ticketId },
    data: { status: "closed", closedAt: new Date() },
  });
  const guild = client?.guilds?.cache.get(GUILD_ID);
  const thread = guild?.channels?.cache.get(ticket.threadId || "") as import("discord.js").TextChannel | undefined;
  if (thread) {
    await thread.permissionOverwrites.create(guild!.roles.everyone, { ViewChannel: false });
    await thread.send(`🔒 Ticket fermé par ${by || "staff"}.`);
  }
  try {
    const logCh = guild?.channels.cache.find((c) => c.name === CHANNELS.logTickets && c.isTextBased()) as import("discord.js").TextChannel | undefined;
    if (logCh) await logCh.send(`🔒 **${ticket.category}** fermé par ${by} — <@${ticket.userId}> (\`${ticketId}\`)`);
  } catch {}
  const user = await client?.users?.fetch(ticket.userId).catch(() => null);
  if (user) await user.send(`🔒 Votre ticket **${ticket.category}** a été fermé. Merci !`);
  await botLog("info", `Ticket ${ticketId} fermé`);
  return ticket;
}
