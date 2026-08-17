import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Ticket, Megaphone, Users as UsersIcon, ShieldCheck, Send as SendIcon, ScrollText, Settings as SettingsIcon, LogOut, Moon, Sun, MessageSquare, Menu, X, PanelLeftClose, PanelLeftOpen, Terminal, Trophy } from "lucide-react";
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

function NavSection({ title, items, tab, setTab, collapsed }: any) {
  const { t } = useUI();
  return (
    <div className="space-y-1">
      {title && !collapsed && (
        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      )}
      {items.map((t2: any) => (
        <button
          key={t2.id}
          onClick={() => setTab(t2.id)}
          title={collapsed ? t(t2.key) : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
            tab === t2.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <t2.icon size={18} className="shrink-0" />
          {!collapsed && t(t2.key)}
        </button>
      ))}
    </div>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { t, lang, setLang, dark, toggleDark } = useUI();
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("botNavCollapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("botNavCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ user: { username?: string; email?: string; role?: string } | null }>("/api/session");
        setUser(s.user?.username || s.user?.email || "");
        setIsAdmin(s.user?.role === "admin");
      } catch {}
    })();
  }, []);

  const isAdminTab = ADMIN_TABS.some((a) => a.id === tab);
  const isSystTab = SYST_TABS.some((s) => s.id === tab);
  useEffect(() => {
    if (!isAdmin && (isAdminTab || isSystTab)) setTab("overview");
  }, [isAdmin, isAdminTab, isSystTab]);

  const Nav = () => (
    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      <NavSection items={MAIN_TABS} tab={tab} setTab={setTab} collapsed={collapsed} />
      {isAdmin && (
        <NavSection title={t("nav.section.admin")} items={ADMIN_TABS} tab={tab} setTab={setTab} collapsed={collapsed} />
      )}
      {isAdmin && (
        <NavSection title={t("nav.section.system")} items={SYST_TABS} tab={tab} setTab={setTab} collapsed={collapsed} />
      )}
    </nav>
  );

  const SidebarFooter = () => (
    <div className={cn("p-3 border-t border-border space-y-2", collapsed && "flex justify-center")}>
      {!collapsed && (
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user || "…"}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-1">
        <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Theme">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={() => setLang(lang === "en" ? "fr" : "en")}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
          title="Langue"
        >
          {lang === "en" ? "FR" : "EN"}
        </button>
        <button onClick={onLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title={t("nav.logout")}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar desktop */}
      <aside className={cn("hidden lg:flex flex-col bg-card border-r border-border shrink-0 sticky top-0 h-screen transition-all duration-200", collapsed ? "w-16" : "w-60")}>
        <div className={cn("flex items-center gap-2 px-5 h-16 border-b border-border", collapsed && "justify-center px-0")}>
          <img src="/logo.png" alt="N" className="w-8 h-8 rounded-lg shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate">NDS-Shop</p>
              <p className="text-xs text-muted-foreground">Bot</p>
            </div>
          )}
        </div>
        <Nav />
        <SidebarFooter />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-16 -right-3 z-10 p-1 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground shadow"
          title={collapsed ? "Déplier" : "Replier"}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </aside>

      {/* Topbar mobile */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="N" className="w-7 h-7 rounded-lg" />
            <span className="font-bold">{t("app.title")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-muted">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setLang(lang === "en" ? "fr" : "en")} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted">
              {lang === "en" ? "FR" : "EN"}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Sidebar mobile overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileOpen(false)}>
            <div className="w-64 h-full bg-card border-r border-border p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <img src="/logo.png" alt="N" className="w-8 h-8 rounded-lg" />
                <span className="font-bold">{t("app.title")}</span>
              </div>
              <NavSection items={MAIN_TABS} tab={tab} setTab={(t2: Tab) => { setTab(t2); setMobileOpen(false); }} />
              {isAdmin && (
                <NavSection title={t("nav.section.admin")} items={ADMIN_TABS} tab={tab} setTab={(t2: Tab) => { setTab(t2); setMobileOpen(false); }} />
              )}
              {isAdmin && (
                <NavSection title={t("nav.section.system")} items={SYST_TABS} tab={tab} setTab={(t2: Tab) => { setTab(t2); setMobileOpen(false); }} />
              )}
              <div className="mt-auto">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive transition-colors w-full"
                >
                  <LogOut size={18} /> {t("nav.logout")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1">
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