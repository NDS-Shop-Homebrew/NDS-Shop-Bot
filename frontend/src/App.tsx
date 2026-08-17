import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Ticket, Megaphone, Users as UsersIcon, ShieldCheck, Send as SendIcon, ScrollText, Settings as SettingsIcon, LogOut, Moon, Sun, Languages, MessageSquare, ChevronDown, MoreHorizontal, Terminal, Trophy } from "lucide-react";
import { UIProvider, useUI } from "./context/UIContext";
import { api, logout } from "./lib/api";
import { cn } from "./lib/utils";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Tickets from "./pages/Tickets";
import Requests from "./pages/Requests";
import Announcements from "./pages/Announcements";
import Users from "./pages/Users";
import Permissions from "./pages/Permissions";
import Messages from "./pages/Messages";
import Send from "./pages/Send";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Commands from "./pages/Commands";
import Leaderboard from "./pages/Leaderboard";

type Tab = "overview" | "tickets" | "requests" | "announcements" | "users" | "permissions" | "messages" | "send" | "logs" | "settings" | "commands" | "leaderboard";

const MAIN_TABS: { id: Tab; icon: any; key: string }[] = [
  { id: "overview", icon: LayoutDashboard, key: "nav.overview" },
  { id: "tickets", icon: Ticket, key: "nav.tickets" },
  { id: "messages", icon: MessageSquare, key: "nav.messages" },
];

const ADMIN_TABS: { id: Tab; icon: any; key: string }[] = [
  { id: "users", icon: UsersIcon, key: "nav.users" },
  { id: "requests", icon: Ticket, key: "nav.requests" },
  { id: "leaderboard", icon: Trophy, key: "nav.leaderboard" },
  { id: "commands", icon: Terminal, key: "nav.commands" },
  { id: "announcements", icon: Megaphone, key: "nav.announcements" },
];

const SYST_TABS: { id: Tab; icon: any; key: string }[] = [
  { id: "settings", icon: SettingsIcon, key: "nav.settings" },
  { id: "permissions", icon: ShieldCheck, key: "nav.permissions" },
  { id: "send", icon: SendIcon, key: "nav.send" },
  { id: "logs", icon: ScrollText, key: "nav.logs" },
];

function Shell({ onLogout }: { onLogout: () => void }) {
  const { t, lang, setLang, dark, toggleDark } = useUI();
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [systOpen, setSystOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);
  const systRef = useRef<HTMLDivElement>(null);

  // Fermeture des dropdowns au clic extérieur
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) setAdminOpen(false);
      if (systRef.current && !systRef.current.contains(e.target as Node)) setSystOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ user: { username?: string; email?: string; role?: string } | null }>("/api/session");
        setUser(s.user?.username || s.user?.email || "");
        setIsAdmin(s.user?.role === "admin");
      } catch {}
    })();
  }, []);

  // Repli vers un onglet autorisé si le rôle change ou si on est sur un onglet interdit
  const isAdminTab = ADMIN_TABS.some((a) => a.id === tab);
  const isSystTab = SYST_TABS.some((s) => s.id === tab);
  useEffect(() => {
    if (!isAdmin && (isAdminTab || isSystTab)) setTab("overview");
  }, [isAdmin, isAdminTab, isSystTab]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="N" className="w-8 h-8 rounded-lg" />
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
        <nav className="max-w-7xl mx-auto px-4 flex flex-wrap items-center gap-1 pb-2">
          {MAIN_TABS.map((t2) => (
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

          {/* Dropdown Admin + Système (réservés aux admins) */}
          {isAdmin && (<>
          <div ref={adminRef} className="relative">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                isAdminTab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <MoreHorizontal size={15} /> Gestion <ChevronDown size={12} />
            </button>
            {adminOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[180px] z-40">
                {ADMIN_TABS.map((t2) => (
                  <button
                    key={t2.id}
                    onClick={() => { setTab(t2.id); setAdminOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      tab === t2.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <t2.icon size={15} /> {t(t2.key)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Système */}
          <div ref={systRef} className="relative">
            <button
              onClick={() => setSystOpen(!systOpen)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                isSystTab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <MoreHorizontal size={15} /> Système <ChevronDown size={12} />
            </button>
            {systOpen && (
              <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[180px] z-40">
                {SYST_TABS.map((t2) => (
                  <button
                    key={t2.id}
                    onClick={() => { setTab(t2.id); setSystOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      tab === t2.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <t2.icon size={15} /> {t(t2.key)}
                  </button>
                ))}
              </div>
            )}
          </div>
          </>)}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === "overview" && <Overview />}
          {tab === "tickets" && <Tickets />}
          {tab === "requests" && <Requests />}
          {tab === "announcements" && <Announcements />}
          {tab === "users" && <Users />}
          {tab === "permissions" && <Permissions />}
          {tab === "messages" && <Messages />}
          {tab === "send" && <Send />}
          {tab === "logs" && <Logs />}
          {tab === "settings" && <Settings />}
          {tab === "commands" && <Commands />}
          {tab === "leaderboard" && <Leaderboard />}
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
