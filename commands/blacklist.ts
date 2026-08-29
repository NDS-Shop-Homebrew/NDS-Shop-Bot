import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../lib/db.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Bannir un utilisateur du bot / Blacklist a user")
    .addSubcommand((s) =>
      s.setName("add").setDescription("Bannir").addUserOption((o) => o.setName("user").setDescription("L'utilisateur").setRequired(true)).addStringOption((o) => o.setName("reason").setDescription("Raison"))
    )
    .addSubcommand((s) => s.setName("remove").setDescription("Débannir").addUserOption((o) => o.setName("user").setDescription("L'utilisateur").setRequired(true)))
    .addSubcommand((s) => s.setName("list").setDescription("Lister les bannis")),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "add") {
      const target = interaction.options.getUser("user")!;
      const reason = interaction.options.getString("reason") || "Aucune raison";
      await prisma.botBlacklist.upsert({
        where: { discordId: target.id },
        update: { reason },
        create: { discordId: target.id, reason },
      });
      await botLog("warn", `${interaction.user.tag} a blacklisté ${target.username}: ${reason}`);
      await interaction.reply({ content: `🚫 ${target.username} banni du bot.`, ephemeral: true });
    } else if (sub === "remove") {
      const target = interaction.options.getUser("user")!;
      await prisma.botBlacklist.delete({ where: { discordId: target.id } }).catch(() => {});
      await interaction.reply({ content: `✅ ${target.username} débanni du bot.`, ephemeral: true });
    } else {
      const list = await prisma.botBlacklist.findMany();
      await interaction.reply(list.length ? list.map((b) => `<@${b.discordId}> — ${b.reason || ""}`).join("\n") : "Aucun banni.");
    }
  },
};
