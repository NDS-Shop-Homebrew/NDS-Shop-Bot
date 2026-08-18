import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, Megaphone, Users as UsersIcon, ShieldCheck, Send as SendIcon, ScrollText, Settings as SettingsIcon, LogOut, MessageSquare, Menu, X, PanelLeftClose, PanelLeftOpen, Terminal, Trophy } from "lucide-react";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { DarkModeToggle } from "./DarkModeToggle";
import { LangToggle } from "./LangToggle";

type Tab = "overview" | "tickets" | "requests" | "announcements" | "users" | "permissions" | "messages" | "send" | "logs" | "settings" | "commands" | "leaderboard";

const MAIN_TABS: { to: Tab; icon: any; key: string }[] = [
  { to: "overview", icon: LayoutDashboard, key: "nav.overview" },
  { to: "tickets", icon: Ticket, key: "nav.tickets" },
  { to: "messages", icon: MessageSquare, key: "nav.messages" },
];

const ADMIN_TABS: { to: Tab; icon: any; key: string }[] = [
  { to: "users", icon: UsersIcon, key: "nav.users" },
  { to: "requests", icon: Ticket, key: "nav.requests" },
  { to: "leaderboard", icon: Trophy, key: "nav.leaderboard" },
  { to: "commands", icon: Terminal, key: "nav.commands" },
  { to: "announcements", icon: Megaphone, key: "nav.announcements" },
];

const SYST_TABS: { to: Tab; icon: any; key: string }[] = [
  { to: "settings", icon: SettingsIcon, key: "nav.settings" },
  { to: "permissions", icon: ShieldCheck, key: "nav.permissions" },
  { to: "send", icon: SendIcon, key: "nav.send" },
  { to: "logs", icon: ScrollText, key: "nav.logs" },
];

function NavSection({ title, items, collapsed }: { title?: string; items: { to: Tab; icon: any; key: string }[]; collapsed: boolean }) {
  const { t } = useUI();
  return (
    <div className="space-y-1">
      {title && !collapsed && (
        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={`/${item.to}`}
          title={collapsed ? t(item.key) : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )
          }
        >
          <item.icon size={18} className="shrink-0" />
          {!collapsed && t(item.key)}
        </NavLink>
      ))}
    </div>
  );
}

export default function Layout() {
  const { t } = useUI();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("botNavCollapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("botNavCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const SidebarFooter = () => (
    <div className="p-3 border-t border-border space-y-2">
      {!collapsed && (
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              {user?.username?.slice(0, 2).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <Badge variant={user?.role === "member" ? "secondary" : "default"} className="mt-0.5">
                {user?.role}
              </Badge>
            </div>
          </div>
          <DarkModeToggle />
          <button onClick={onLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title={t("nav.logout")}>
            <LogOut size={18} />
          </button>
        </div>
      )}
      {collapsed && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
            {user?.username?.slice(0, 2).toUpperCase() || "?"}
          </div>
          <button onClick={onLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title={t("nav.logout")}>
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );

  const Nav = () => (
    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      <NavSection items={MAIN_TABS} collapsed={collapsed} />
      {isAdmin && <NavSection title={t("nav.section.admin")} items={ADMIN_TABS} collapsed={collapsed} />}
      {isAdmin && <NavSection title={t("nav.section.system")} items={SYST_TABS} collapsed={collapsed} />}
    </nav>
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
            <LangToggle />
            <DarkModeToggle />
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
              <NavSection items={MAIN_TABS} collapsed={false} />
              {isAdmin && <NavSection title={t("nav.section.admin")} items={ADMIN_TABS} collapsed={false} />}
              {isAdmin && <NavSection title={t("nav.section.system")} items={SYST_TABS} collapsed={false} />}
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
          <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}