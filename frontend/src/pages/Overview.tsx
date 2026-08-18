import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { LangToggle } from "../components/LangToggle";
import { api, type StatusData } from "../lib/api";
import { RefreshCw, Bot, Server, Users, Gamepad2, Ticket, Command, ShieldBan, Clock, MessageSquare, Loader2 } from "lucide-react";

export default function Overview() {
  const { t } = useUI();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super-admin";
  const [status, setStatus] = useState<StatusData | null>(null);
  const [openTickets, setOpenTickets] = useState<number>(0);
  const [commands, setCommands] = useState<number>(0);
  const [blacklist, setBlacklist] = useState<number>(0);
  const [dms, setDms] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [statusRes, tickets, commands, blacklist, contacts] = await Promise.allSettled([
      api<StatusData>("/api/status"),
      api<any[]>("/api/tickets?status=open"),
      api<any[]>("/api/commands?limit=100"),
      api<any[]>("/api/blacklist"),
      api<any[]>("/api/dm/contacts"),
    ]);
    if (statusRes.status === "fulfilled") setStatus(statusRes.value);
    if (tickets.status === "fulfilled") setOpenTickets(tickets.value.length);
    if (commands.status === "fulfilled") setCommands(commands.value.length);
    if (blacklist.status === "fulfilled") setBlacklist(blacklist.value.length);
    if (contacts.status === "fulfilled") setDms(contacts.value.filter((c) => c.unreadCount > 0).length);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const uptime = status?.bot?.uptime ? Math.floor(status.bot.uptime / 1000) : 0;

  const cards = [
    { icon: Bot, label: t("overview.bot"), value: status?.bot?.online ? status.bot.username || t("overview.online") : t("overview.offline"), accent: status?.bot?.online },
    { icon: Server, label: t("overview.server"), value: status?.guild?.name || "—" },
    { icon: Users, label: t("overview.members"), value: status?.guild?.memberCount ?? "—" },
    { icon: Gamepad2, label: t("overview.games"), value: status?.games ?? "—" },
    { icon: Ticket, label: t("overview.openTickets"), value: openTickets },
    { icon: Command, label: t("overview.commands24"), value: commands },
    { icon: MessageSquare, label: "MP non lus", value: dms },
    { icon: ShieldBan, label: t("overview.blacklist"), value: blacklist },
    { icon: Clock, label: t("overview.uptime"), value: uptime ? `${Math.floor(uptime / 86400)}j ${Math.floor((uptime % 86400) / 3600)}h` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("overview.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("overview.greeting")} <strong>{user?.username}</strong> · {t("overview.role")}{" "}
            <Badge variant={isAdmin ? "default" : "secondary"}>{user?.role}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <DarkModeToggle />
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : t("overview.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <c.icon size={14} className={c.accent === false ? "text-red-500" : "text-primary"} /> {c.label}
              </div>
              <p className="text-xl font-bold truncate">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-2">{t("overview.quickActions")}</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="default" onClick={async () => { try { await api("/api/poll", { method: "POST" }); load(); } catch {} }} disabled={loading}>
                <RefreshCw size={15} /> {t("overview.scanGames")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}