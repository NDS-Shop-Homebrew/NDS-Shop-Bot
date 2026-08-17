import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../lib/db.ts";
import { botLog } from "../lib/botLog.ts";

function parseDuration(s: string): number | null {
  const re = /(\d+)([smhd])/g;
  let m: RegExpExecArray | null;
  let ms = 0;
  while ((m = re.exec(s))) {
    const n = Number(m[1]);
    const u = m[2];
    ms += n * (u === "s" ? 1000 : u === "m" ? 60000 : u === "h" ? 3600000 : 86400000);
  }
  return ms || null;
}

export default {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Rappel en MP / DM reminder")
    .addStringOption((o) => o.setName("message").setDescription("Le rappel").setRequired(true))
    .addStringOption((o) => o.setName("time").setDescription("Durée (ex: 30m, 1h, 2d)").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message")!;
    const timeStr = interaction.options.getString("time")!;
    const ms = parseDuration(timeStr);
    if (!ms || ms < 10000) {
      return interaction.reply("⚠️ Durée invalide. Formats : `30m`, `1h30m`, `2d`, `90s` (minimum 10s).");
    }
    const dueAt = new Date(Date.now() + ms);
    await prisma.reminder.create({
      data: { discordId: interaction.user.id, content: message, channelId: interaction.channelId, dueAt },
    });
    await botLog("info", `Rappel créé pour ${interaction.user.tag} dans ${timeStr}`);
    await interaction.reply(`⏰ Rappel dans **${timeStr}** : *${message}*`);
  },
};