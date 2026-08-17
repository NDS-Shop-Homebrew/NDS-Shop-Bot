import type { GuildMember } from "discord.js";
import prisma from "./db.ts";
import { botLog } from "./botLog.ts";

export const ROLE_ORDER = ["@everyone", "Member", "Contributor", "Tester", "Developer", "Moderator", "Admin"];

export const DEFAULT_MATRIX: Record<string, string[]> = {
  public: ["@everyone"],
  favorites: ["@everyone"],
  profile: ["@everyone"],
  watch: ["@everyone"],
  remind: ["@everyone"],
  top: ["@everyone"],
  beta: ["Tester", "Developer", "Moderator", "Admin"],
  testers: ["Tester", "Developer", "Moderator", "Admin"],
  announce: ["Moderator", "Developer", "Admin"],
  embed: ["Moderator", "Developer", "Admin"],
  say: ["Moderator", "Developer", "Admin"],
  purge: ["Moderator", "Developer", "Admin"],
  tickets: ["Moderator", "Developer", "Admin"],
  dm: ["Moderator", "Developer", "Admin"],
  warn: ["Moderator", "Admin"],
  kick: ["Moderator", "Admin"],
  mute: ["Moderator", "Admin"],
  unmute: ["Moderator", "Admin"],
  ban: ["Moderator", "Admin"],
  unban: ["Moderator", "Admin"],
  lock: ["Moderator", "Admin"],
  unlock: ["Moderator", "Admin"],
  levelconfig: ["Admin"],
  reload: ["Admin"],
  blacklist: ["Admin"],
};

type Matrix = Record<string, string[]>;
let matrixCache: Matrix | null = null;

export async function loadMatrix() {
  try {
    const row = await prisma.botSetting.findUnique({ where: { key: "permissionMatrix" } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (parsed && typeof parsed === "object") {
        matrixCache = { ...DEFAULT_MATRIX, ...parsed };
        return matrixCache;
      }
    }
  } catch {}
  matrixCache = { ...DEFAULT_MATRIX };
  return matrixCache;
}

export async function getMatrix(): Promise<Matrix> {
  return matrixCache || (await loadMatrix())!;
}

export async function reloadMatrix() {
  matrixCache = null;
  return loadMatrix();
}

function memberRoles(member: GuildMember) {
  if (!member?.roles?.cache) return [];
  return member.roles.cache
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => r.name);
}

export async function canUse(member: GuildMember | null | undefined, commandName: string) {
  if (!member) return false;
  const matrix = await getMatrix();
  const allowed = matrix[commandName] || matrix.public;
  if (!allowed || allowed.includes("*")) return true;
  if (allowed.includes("@everyone")) return true;

  const roles = memberRoles(member);
  for (const role of roles) {
    if (allowed.includes(role)) return true;
  }
  return false;
}

export function allowedRoles(commandName: string) {
  const m = matrixCache || DEFAULT_MATRIX;
  return m[commandName] || m.public || [];
}

export async function saveMatrix(matrix: Matrix) {
  matrixCache = { ...DEFAULT_MATRIX, ...matrix };
  await prisma.botSetting.upsert({
    where: { key: "permissionMatrix" },
    update: { value: JSON.stringify(matrixCache) },
    create: { key: "permissionMatrix", value: JSON.stringify(matrixCache) },
  });
  await botLog("info", "Matrice de permissions mise à jour");
  return matrixCache;
}
