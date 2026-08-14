// Logger bot en base (table bot_log)
const prisma = require("./db");

async function botLog(level, message) {
  try {
    await prisma.botLog.create({ data: { level, message: String(message).slice(0, 4000) } });
  } catch {}
  const icon = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
  console.log(`${icon} ${message}`);
}

module.exports = { botLog };
