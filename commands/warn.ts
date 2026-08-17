import { SlashCommandBuilder, type ChatInputCommandInteraction, type Client } from "discord.js";
import prisma from "../lib/db.ts";
import { botLog } from "../lib/botLog.ts";
import { GUILD_ID, CHANNELS } from "../config.ts";

async function modLog(client: Client, message: string) {
  const guild = client.guilds.cache.get(GUILD_ID);
  const ch = guild?.channels.cache.find((c) => c.name === CHANNELS.logMessages && c.isTextBased()) as import("discord.js").TextChannel | undefined;
  if (ch) await ch.send(`⚠️ ${message}`).catch(() => {});
}

export default {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un membre / Warn a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Raison")),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user")!;
    const reason = interaction.options.getString("reason") || "Aucune raison";
    await prisma.warn.create({
      data: { discordId: target.id, modId: interaction.user.id, reason },
    });
    const count = await prisma.warn.count({ where: { discordId: target.id } });
    await target.send(`⚠️ Vous avez reçu un avertissement sur NDS-Shop.\n**Raison** : ${reason}\n**Total** : ${count} avertissement(s)`).catch(() => {});
    await botLog("warn", `${interaction.user.tag} a warn ${target.username} (${count}): ${reason}`);
    await modLog(interaction.client, `${interaction.user.tag} ⚠️ warn **${target.username}** (${count}) — ${reason}`);
    await interaction.reply({ content: `⚠️ ${target.username} averti (${count}).`, ephemeral: true });
  },
};