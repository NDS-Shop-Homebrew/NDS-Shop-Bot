import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute un membre / Mute a member")
    .addUserOption((o) => o.setName("user").setDescription("Le membre").setRequired(true))
    .addStringOption((o) => o.setName("time").setDescription("Durée (ex: 10m, 1h, 1d)")),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember("user") as GuildMember | null;
    const time = interaction.options.getString("time");
    const guild = interaction.guild!;
    let mutedRole = guild.roles.cache.find((r) => r.name === "Muted");
    if (!mutedRole) {
      mutedRole = await guild.roles.create({ name: "Muted", color: "#64748B" });
      for (const ch of guild.channels.cache.values()) {
        if (ch.isTextBased()) {
          await (ch as import("discord.js").TextChannel).permissionOverwrites.create(mutedRole, { SendMessages: false, AddReactions: false }).catch(() => {});
        }
      }
    }
    await target!.roles.add(mutedRole);
    await botLog("warn", `${interaction.user.tag} a mute ${target!.user.username}${time ? ` (${time})` : ""}`);
    await interaction.reply({ content: `🔇 ${target!.user.username} muté${time ? ` pour ${time}` : ""}.`, ephemeral: true });
  },
};
