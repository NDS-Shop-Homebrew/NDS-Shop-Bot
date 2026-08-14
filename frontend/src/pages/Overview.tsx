import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useUI } from "../context/UIContext";
import { api, type StatusData } from "../lib/api";
import { RefreshCw, Bot, Server, Users, Gamepad2, Ticket, Command, ShieldBan, Clock, MessageSquare } from "lucide-react";

export default function Overview() {
  const { t } = useUI();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [openTickets, setOpenTickets] = useState<number>(0);
  const [commands, setCommands] = useState<number>(0);
  const [blacklist, setBlacklist] = useState<number>(0);
  const [dms, setDms] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await api<StatusData>("/api/status");
      setStatus(s);
      try { setOpenTickets((await api<any[]>("/api/tickets?status=open")).length); } catch {}
      try { setCommands((await api<any[]>("/api/commands?limit=100")).length); } catch {}
      try { setBlacklist((await api<any[]>("/api/blacklist")).length); } catch {}
      try { setDms((await api<any[]>("/api/dm/contacts")).filter((c) => c.unreadCount > 0).length); } catch {}
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">{t("overview.quickActions")}</h2>
          <Button
            variant="default"
            onClick={async () => {
              try {
                await api("/api/poll", { method: "POST" });
                load();
              } catch {}
            }}
            disabled={loading}
          >
            <RefreshCw size={15} /> {t("overview.scanGames")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
