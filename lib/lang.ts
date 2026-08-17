export const T: Record<Lang, LangSet> = {
  fr: {
    noDescription: "Pas de description disponible.",
    unknown: "N/A",
    serial: "Serial",
    region: "Région",
    developer: "Développeur",
    publisher: "Éditeur",
    genres: "Genres",
    release: "Sortie",
    rating: "Classification",
    notFound: "Jeu introuvable",
    serialNotFound: (s) => `Aucun jeu trouvé avec le serial \`${s}\`.`,
    gameNotFound: (q) => `Aucun jeu trouvé pour « ${q} ».`,
    error: "Une erreur est survenue.",
    games: "jeux",
    systems: "systèmes",
    lastUpdated: "Dernière mise à jour",
    version: "Version",
    author: "Auteur",
    systemsField: "Systèmes",
    downloads: "Téléchargements",
    viewGame: "Voir la fiche",
    moreResults: (n) => `+ ${n} autre(s) résultat(s) — affinez votre recherche`,
    randomTitle: "Jeu aléatoire",
    statsTitle: "Statistiques NDS-Shop",
    teamTitle: "Équipe NDS-Shop",
    teamEmpty: "Aucun membre enregistré.",
    status: {
      online: "En ligne",
      idle: "Absent",
      dnd: "Ne pas déranger",
      offline: "Hors ligne",
    },
    helpTitle: "Commandes NDS-Shop",
    suggestSent: "Suggestion envoyée dans #suggestions !",
    reportSent: "Rapport envoyé dans #bug-reports !",
    suggestTitle: "💡 Suggestion",
    reportTitle: "🐛 Rapport de bug",
    byUser: "par",
    newGamesTitle: "🎮 Nouveau jeu disponible",
  },
  en: {
    noDescription: "No description available.",
    unknown: "N/A",
    serial: "Serial",
    region: "Region",
    developer: "Developer",
    publisher: "Publisher",
    genres: "Genres",
    release: "Release",
    rating: "Rating",
    notFound: "Game not found",
    serialNotFound: (s) => `No game found for serial \`${s}\`.`,
    gameNotFound: (q) => `No game found for "${q}".`,
    error: "An error occurred.",
    games: "games",
    systems: "systems",
    lastUpdated: "Last updated",
    version: "Version",
    author: "Author",
    systemsField: "Systems",
    downloads: "Downloads",
    viewGame: "View game page",
    moreResults: (n) => `+ ${n} more result(s) — refine your search`,
    randomTitle: "Random game",
    statsTitle: "NDS-Shop stats",
    teamTitle: "NDS-Shop team",
    teamEmpty: "No registered members.",
    status: {
      online: "Online",
      idle: "Idle",
      dnd: "Do not disturb",
      offline: "Offline",
    },
    helpTitle: "NDS-Shop commands",
    suggestSent: "Suggestion sent to #suggestions!",
    reportSent: "Report sent to #bug-reports!",
    suggestTitle: "💡 Suggestion",
    reportTitle: "🐛 Bug report",
    byUser: "by",
    newGamesTitle: "🎮 New game available",
  },
};

type Lang = "fr" | "en";
type LangSet = {
  noDescription: string;
  unknown: string;
  serial: string;
  region: string;
  developer: string;
  publisher: string;
  genres: string;
  release: string;
  rating: string;
  notFound: string;
  serialNotFound: (s: string) => string;
  gameNotFound: (q: string) => string;
  error: string;
  games: string;
  systems: string;
  lastUpdated: string;
  version: string;
  author: string;
  systemsField: string;
  downloads: string;
  viewGame: string;
  moreResults: (n: number) => string;
  randomTitle: string;
  statsTitle: string;
  teamTitle: string;
  teamEmpty: string;
  status: { online: string; idle: string; dnd: string; offline: string };
  helpTitle: string;
  suggestSent: string;
  reportSent: string;
  suggestTitle: string;
  reportTitle: string;
  byUser: string;
  newGamesTitle: string;
};

type MemberLike = {
  roles?: { cache?: { values(): Iterable<{ name: string }> } } | string[] | null;
} | null;

export function detectLang(member: MemberLike): Lang {
  if (!member) return "fr";
  const roles = member.roles;
  if (!roles) return "fr";
  const names = Array.isArray(roles)
    ? roles
    : [...roles.cache?.values() ?? []].map((r) => r.name);
  if (names.includes("English")) return "en";
  return "fr";
}
