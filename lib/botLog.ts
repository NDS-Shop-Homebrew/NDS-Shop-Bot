import prisma from "./db.ts";

export async function botLog(level: string, message: string) {
  try {
    await prisma.botLog.create({ data: { level, message: String(message).slice(0, 4000) } });
  } catch {}
  const icon = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
  console.log(`${icon} ${message}`);
}
