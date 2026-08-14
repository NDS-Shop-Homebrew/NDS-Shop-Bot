import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Ticket, Megaphone, Gamepad2, Users as UsersIcon, ShieldCheck, Send as SendIcon, ScrollText, Settings as SettingsIcon, LogOut, Moon, Sun, Languages } from "lucide-react";
import { UIProvider, useUI } from "./context/UIContext";
import { api, logout } from "./lib/api";
import { cn } from "./lib/utils";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Tickets from "./pages/Tickets";
import Announcements from "./pages/Announcements";
import Games from "./pages/Games";
import Users from "./pages/Users";
import Permissions from "./pages/Permissions";
import Send from "./pages/Send";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";

type Tab = "overview" | "tickets" | "announcements" | "games" | "users" | "permissions" | "send" | "logs" | "settings";

const TABS: { id: Tab; icon: any; key: string }[] = [
  { id: "overview", icon: LayoutDashboard, key: "nav.overview" },
  { id: "tickets", icon: Ticket, key: "nav.tickets" },
  { id: "announcements", icon: Megaphone, key: "nav.announcements" },
  { id: "games", icon: Gamepad2, key: "nav.games" },
  { id: "users", icon: UsersIcon, key: "nav.users" },
  { id: "permissions", icon: ShieldCheck, key: "nav.permissions" },
  { id: "send", icon: SendIcon, key: "nav.send" },
  { id: "logs", icon: ScrollText, key: "nav.logs" },
  { id: "settings", icon: SettingsIcon, key: "nav.settings" },
];

function Shell({ onLogout }: { onLogout: () => void }) {
  const { t, lang, setLang, dark, toggleDark } = useUI();
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ user: { username?: string; email?: string } | null }>("/api/session");
        setUser(s.user?.username || s.user?.email || "");
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="dsi-gradient w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">N</div>
            <span className="font-bold">{t("app.title")}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleDark} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "fr" : "en")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Languages size={13} /> {lang === "en" ? "FR" : "EN"}
            </button>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user}</span>
            <button onClick={onLogout} className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-muted transition-colors flex items-center gap-1">
              <LogOut size={14} /> {t("nav.logout")}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
          {TABS.map((t2) => (
            <button
              key={t2.id}
              onClick={() => setTab(t2.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                tab === t2.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <t2.icon size={15} /> {t(t2.key)}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === "overview" && <Overview />}
          {tab === "tickets" && <Tickets />}
          {tab === "announcements" && <Announcements />}
          {tab === "games" && <Games />}
          {tab === "users" && <Users />}
          {tab === "permissions" && <Permissions />}
          {tab === "send" && <Send />}
          {tab === "logs" && <Logs />}
          {tab === "settings" && <Settings />}
        </motion.div>
      </main>
    </div>
  );
}

function AppInner() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ user: unknown }>("/api/session");
        setAuthed(!!s.user);
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  if (authed === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Shell
      onLogout={async () => {
        await logout();
        setAuthed(false);
      }}
    />
  );
}

export default function App() {
  return (
    <UIProvider>
      <AppInner />
    </UIProvider>
  );
}
