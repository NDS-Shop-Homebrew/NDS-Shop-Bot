// Permission system — chaque commande est autorisée selon la matrice par rôle.
// La matrice vit en BDD (BotSetting "permissionMatrix") et est éditable via le dashboard.
const prisma = require("./db");
const { botLog } = require("./botLog");

// Hiérarchie des rôles (index croissant = plus de pouvoir)
const ROLE_ORDER = ["@everyone", "Membre", "Contributeur", "Tester", "Développeur", "Modérateur", "Admin"];

// Matrice par défaut : commande -> rôles autorisés (un membre passe si au moins un de ses rôles est listé)
const DEFAULT_MATRIX = {
  public: ["@everyone"],
  favorites: ["@everyone"],
  profile: ["@everyone"],
  watch: ["@everyone"],
  remind: ["@everyone"],
  top: ["@everyone"],
  "beta": ["Tester", "Développeur", "Modérateur", "Admin"],
  "testers": ["Tester", "Développeur", "Modérateur", "Admin"],
  "announce": ["Modérateur", "Développeur", "Admin"],
  "embed": ["Modérateur", "Développeur", "Admin"],
  "say": ["Modérateur", "Développeur", "Admin"],
  "purge": ["Modérateur", "Développeur", "Admin"],
  "tickets": ["Modérateur", "Développeur", "Admin"],
  "dm": ["Modérateur", "Développeur", "Admin"],
  "warn": ["Modérateur", "Admin"],
  "kick": ["Modérateur", "Admin"],
  "mute": ["Modérateur", "Admin"],
  "unmute": ["Modérateur", "Admin"],
  "ban": ["Modérateur", "Admin"],
  "unban": ["Modérateur", "Admin"],
  "lock": ["Modérateur", "Admin"],
  "unlock": ["Modérateur", "Admin"],
  "levelconfig": ["Admin"],
  "reload": ["Admin"],
  "blacklist": ["Admin"],
};

let matrixCache = null;

async function loadMatrix() {
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

async function getMatrix() {
  return matrixCache || (await loadMatrix());
}

async function reloadMatrix() {
  matrixCache = null;
  return loadMatrix();
}

// Rôles Discord du membre, du plus haut au plus bas
function memberRoles(member) {
  if (!member?.roles?.cache) return [];
  return member.roles.cache
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => r.name);
}

// Le membre a-t-il accès à la commande ?
async function canUse(member, commandName) {
  if (!member) return false;
  const matrix = await getMatrix();
  const allowed = matrix[commandName] || matrix.public;
  if (!allowed || allowed.includes("*")) return true;
  if (allowed.includes("@everyone")) return true;

  const roles = memberRoles(member);
  // Le rôle le plus élevé du membre décide (hérédité descendante)
  for (const role of roles) {
    if (allowed.includes(role)) return true;
  }
  return false;
}

// Retourne les rôles autorisés pour une commande (pour l'affichage dashboard)
function allowedRoles(commandName) {
  const m = matrixCache || DEFAULT_MATRIX;
  return m[commandName] || m.public || [];
}

async function saveMatrix(matrix) {
  matrixCache = { ...DEFAULT_MATRIX, ...matrix };
  await prisma.botSetting.upsert({
    where: { key: "permissionMatrix" },
    update: { value: JSON.stringify(matrixCache) },
    create: { key: "permissionMatrix", value: JSON.stringify(matrixCache) },
  });
  await botLog("info", "Matrice de permissions mise à jour");
  return matrixCache;
}

module.exports = { canUse, getMatrix, loadMatrix, reloadMatrix, saveMatrix, allowedRoles, ROLE_ORDER };
