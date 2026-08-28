import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "fr" | "en";

const DICT: Record<string, { fr: string; en: string }> = {
  "nav.overview": { fr: "Vue d'ensemble", en: "Overview" },
  "nav.section.main": { fr: "Principal", en: "Main" },
  "nav.section.admin": { fr: "Administration", en: "Administration" },
  "nav.section.system": { fr: "Système", en: "System" },
  "nav.tickets": { fr: "Tickets", en: "Tickets" },
  "nav.requests": { fr: "Demandes", en: "Requests" },
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
  "nav.commands": { fr: "Commandes", en: "Commands" },
  "nav.leaderboard": { fr: "Classement", en: "Leaderboard" },
  "nav.backup": { fr: "Sauvegarde", en: "Backup" },
  "app.title": { fr: "NDS-Shop Bot", en: "NDS-Shop Bot" },
  "login.title": { fr: "Connexion", en: "Sign in" },
  "login.subtitle": { fr: "Connectez-vous pour accéder à l'administration.", en: "Sign in to access the administration." },
  "login.tagline": { fr: "Espace d'administration du bot NDS-Shop.", en: "NDS-Shop Bot administration area." },
  "login.username": { fr: "Identifiant", en: "Username" },
  "login.usernamePh": { fr: "Votre identifiant", en: "Your username" },
  "login.password": { fr: "Mot de passe", en: "Password" },
  "login.passwordPh": { fr: "••••••••", en: "••••••••" },
  "login.error": { fr: "Identifiants incorrects", en: "Invalid credentials" },
  "login.serverError": { fr: "Erreur de connexion au serveur", en: "Connection error" },
  "login.loading": { fr: "Connexion en cours...", en: "Signing in..." },
  "login.submit": { fr: "Connexion", en: "Sign in" },
  "login.reserved": { fr: "Accès réservé à l'équipe NDS-Shop", en: "Restricted to NDS-Shop team" },
  "login.secure": { fr: "Sécurisé", en: "Secure" },
  "login.private": { fr: "Privé", en: "Private" },
  "login.remember": { fr: "Se souvenir de moi", en: "Remember me" },
  "login.showPassword": { fr: "Afficher le mot de passe", en: "Show password" },
  "login.hidePassword": { fr: "Masquer le mot de passe", en: "Hide password" },
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
  "overview.title": { fr: "Vue d'ensemble", en: "Overview" },
  "overview.greeting": { fr: "Bonjour", en: "Hello" },
  "overview.role": { fr: "rôle", en: "role" },
  "overview.refresh": { fr: "Rafraîchir", en: "Refresh" },
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
