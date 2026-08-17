import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import "dotenv/config";

const GUILD_ID = "1271186486070345843";
const apply = process.argv.includes("--apply");

const EXPECTED: Record<string, string[]> = {
  "📢 information": ["rules", "announcements", "game-info", "game-requests"],
  "🗨️ communautÉ fr": ["général", "nintendo-ds", "homebrew", "entraide", "partage-et-suggestions"],
  "👥 community en": ["general", "nintendo-ds", "homebrew", "help", "sharing-suggestions"],
  "🛠️ project": ["site-dev", "app-dev", "bug-reports", "suggestions"],
  "👔 team": ["dev-zone", "testers", "moderation"],
  "🎫 tickets": ["tickets-readme"],
  "📋 logs": ["log-messages", "log-tickets", "log-commands", "log-errors"],
};

function scoreCategory(cat: { name: string }, kids: { name: string }[]) {
  const expected = EXPECTED[cat.name.toLowerCase()];
  if (!expected) return 0;
  return kids.filter((k) => expected.includes(k.name.toLowerCase())).length;
}

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  await new Promise((res) => client.once("clientReady", res));
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) throw new Error("GUILD INTROUVABLE");

  const all = [...guild.channels.cache.values()];
  const cats = all.filter((ch) => ch.type === ChannelType.GuildCategory);
  const kids = (id: string) => all.filter((ch) => ch.parentId === id);

  const byName = new Map<string, typeof cats>();
  for (const cat of cats) {
    const k = cat.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(cat);
  }

  let removed = 0;
  for (const [name, list] of byName) {
    if (list.length < 2) continue;
    const scored = list.map((cat) => ({ cat, score: scoreCategory(cat, kids(cat.id)) }));
    scored.sort((a, b) => b.score - a.score || (BigInt(b.cat.id) > BigInt(a.cat.id) ? 1 : -1));
    const keep = scored[0];
    for (const s of scored.slice(1)) {
      console.log(`SUPPR CATÉGORIE: ${s.cat.name} (score ${s.score} vs gardé ${keep.score})`);
      for (const ch of kids(s.cat.id)) {
        console.log(`   SUPPR SALON: ${ch.name}`);
      }
      if (apply) {
        for (const ch of kids(s.cat.id)) await ch.delete().catch((e) => console.log(`   ! ${ch.name}: ${(e as Error).message}`));
        await s.cat.delete().catch((e) => console.log(`   ! ${s.cat.name}: ${(e as Error).message}`));
      }
      removed += 1 + kids(s.cat.id).length;
    }
  }

  const keepNames = new Set<typeof cats[number]>();
  for (const [, list] of byName) if (list.length === 1) keepNames.add(list[0]);
  for (const cat of keepNames) {
    for (const ch of kids(cat.id)) {
      const n = ch.name.toLowerCase();
      if (n === "game-announcements") {
        console.log(`SUPPR SALON PÉRIMÉ: ${ch.name} (dans ${cat.name})`);
        if (apply) await ch.delete().catch((e) => console.log(`   ! ${ch.name}: ${(e as Error).message}`));
        removed += 1;
      }
    }
  }

  console.log(apply ? `✅ ${removed} éléments supprimés` : `DRY-RUN: ${removed} éléments seraient supprimés (relance avec --apply)`);
  process.exit(0);
}

main().catch((e) => { console.error("ERR:", (e as Error).message); process.exit(1); });