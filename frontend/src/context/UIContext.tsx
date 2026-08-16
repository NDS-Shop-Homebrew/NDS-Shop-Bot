import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "fr" | "en";

const DICT: Record<string, { fr: string; en: string }> = {
  "nav.overview": { fr: "Vue d'ensemble", en: "Overview" },
  "nav.tickets": { fr: "Tickets", en: "Tickets" },
  "nav.announcements": { fr: "Annonces", en: "Announcements" },
  "nav.games": { fr: "Jeux", en: "Games" },
  "nav.users": { fr: "Utilisateurs", en: "Users" },
  "nav.permissions": { fr: "Permissions", en: "Permissions" },
  "nav.messages": { fr: "Messages", en: "Messages" },
  "nav.blacklist": { fr: "Blacklist", en: "Blacklist" },
  "nav.send": { fr: "Envoyer", en: "Send" },
  "nav.channels": { fr: "Salons", en: "Channels" },
  "nav.logs": { fr: "Logs", en: "Logs" },
  "nav.settings": { fr: "Réglages", en: "Settings" },
  "nav.logout": { fr: "Déconnexion", en: "Logout" },
  "app.title": { fr: "NDS-Shop Bot", en: "NDS-Shop Bot" },
  "login.tagline": { fr: "Identifiants du back-office upload", en: "Upload back-office credentials" },
  "login.email": { fr: "Email", en: "Email" },
  "login.password": { fr: "Mot de passe", en: "Password" },
  "login.submit": { fr: "Connexion", en: "Sign in" },
  "overview.bot": { fr: "Bot", en: "Bot" },
  "overview.server": { fr: "Serveur", en: "Server" },
  "overview.members": { fr: "Membres", en: "Members" },
  "overview.games": { fr: "Jeux", en: "Games" },
  "overview.openTickets": { fr: "Tickets ouverts", en: "Open tickets" },
  "overview.commands24": { fr: "Commandes (24h)", en: "Commands (24h)" },
  "overview.blacklist": { fr: "Blacklist", en: "Blacklist" },
  "overview.uptime": { fr: "Uptime", en: "Uptime" },
  "overview.quickActions": { fr: "Actions rapides", en: "Quick actions" },
  "overview.scanGames": { fr: "Scanner les nouveaux jeux", en: "Scan new games" },
  "overview.online": { fr: "En ligne", en: "Online" },
  "overview.offline": { fr: "Hors ligne", en: "Offline" },
};

interface UIContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  toggleDark: () => void;
  t: (key: string) => string;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("botLang") as Lang) || "fr");
  const [dark, setDark] = useState<boolean>(() => (localStorage.getItem("botDark") ?? "dark") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setLang = (l: Lang) => {
    localStorage.setItem("botLang", l);
    setLangState(l);
  };

  const toggleDark = () => {
    const next = !dark;
    localStorage.setItem("botDark", next ? "dark" : "light");
    setDark(next);
  };

  const t = (key: string) => DICT[key]?.[lang] ?? key;

  return <UIContext.Provider value={{ lang, setLang, dark, toggleDark, t }}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
