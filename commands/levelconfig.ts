import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../lib/db.js";
import { botLog } from "../lib/botLog.js";

export default {
  data: new SlashCommandBuilder()
    .setName("levelconfig")
    .setDescription("Configurer le leveling / Configure leveling")
    .addBooleanOption((o) => o.setName("enabled").setDescription("Activer / désactiver"))
    .addIntegerOption((o) => o.setName("xp").setDescription("XP par message")),

  async execute(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean("enabled");
    const xp = interaction.options.getInteger("xp");
    let cfg: { enabled: boolean; xpPerMessage: number } = { enabled: true, xpPerMessage: 15 };
    try {
      const row = await prisma.botSetting.findUnique({ where: { key: "levelingConfig" } });
      if (row?.value) cfg = { ...cfg, ...JSON.parse(row.value) };
    } catch {}
    if (enabled !== null) cfg.enabled = enabled;
    if (xp !== null) cfg.xpPerMessage = xp;
    await prisma.botSetting.upsert({
      where: { key: "levelingConfig" },
      update: { value: JSON.stringify(cfg) },
      create: { key: "levelingConfig", value: JSON.stringify(cfg) },
    });
    await botLog("info", `${interaction.user.tag} a mis à jour le leveling`);
    await interaction.reply({ content: `✅ Leveling: ${cfg.enabled ? "activé" : "désactivé"} — XP: ${cfg.xpPerMessage}/message`, ephemeral: true });
  },
};
