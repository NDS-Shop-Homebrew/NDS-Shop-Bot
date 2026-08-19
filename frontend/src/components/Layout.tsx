import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, Megaphone, Users as UsersIcon, ShieldCheck, Send as SendIcon,
  ScrollText, Settings as SettingsIcon, LogOut, MessageSquare, Trophy, Terminal,
} from "lucide-react";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DarkModeToggle } from "./DarkModeToggle";
import { LangToggle } from "./LangToggle";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger,
} from "./ui/sidebar";

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

function NavSection({ title, items }: { title: string; items: { to: Tab; icon: any; key: string }[] }) {
  const { t } = useUI();
  const location = useLocation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t(title)}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={location.pathname === `/${item.to}`} tooltip={t(item.key)} className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground">
              <NavLink to={`/${item.to}`}>
                <item.icon />
                <span>{t(item.key)}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default function Layout() {
  const { t } = useUI();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/">
                  <img src="/logo.png" alt="N" className="size-8 rounded-lg" />
                  <div className="group-data-[collapsible=icon]:hidden min-w-0">
                    <p className="font-bold leading-tight truncate">NDS-Shop</p>
                    <p className="text-xs text-muted-foreground">{t("app.title")}</p>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavSection title="nav.section.main" items={MAIN_TABS} />
          {isAdmin && <NavSection title="nav.section.admin" items={ADMIN_TABS} />}
          {isAdmin && <NavSection title="nav.section.system" items={SYST_TABS} />}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold">
                  {user?.username?.slice(0, 2).toUpperCase() || "?"}
                </div>
                <div className="group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user?.username}</p>
                  <Badge variant={user?.role === "member" ? "secondary" : "default"} className="mt-0.5">
                    {user?.role}
                  </Badge>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="group-data-[collapsible=icon]:justify-center flex items-center gap-1 p-2">
                <div className="group-data-[collapsible=icon]:hidden flex items-center gap-1">
                  <DarkModeToggle />
                  <LangToggle />
                </div>
                <Button variant="ghost" size="icon" onClick={onLogout} title={t("nav.logout")} className="text-muted-foreground hover:text-destructive">
                  <LogOut />
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <LangToggle />
          <DarkModeToggle />
        </header>
        <main className="flex-1">
          <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}