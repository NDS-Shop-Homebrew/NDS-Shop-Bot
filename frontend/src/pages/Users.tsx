import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { MessageSquare, ShieldBan, AlertTriangle, Star, Trophy } from "lucide-react";
import { api } from "../lib/api";

interface BotUser {
  discordId: string;
  username: string;
  xp: number;
  level: number;
  totalMsgs: number;
  favorites: string[];
  warns?: { reason: string; createdAt: string }[];
  tickets?: { category: string; status: string; id: string }[];
}

export default function Users() {
  const [users, setUsers] = useState<BotUser[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (s: string) => {
    try {
      const data = await api<BotUser[]>(`/api/users?search=${encodeURIComponent(s)}`);
      // enrichir avec warns et tickets via des appels parallèles
      const enriched = await Promise.all(
        data.slice(0, 30).map(async (u) => {
          try {
            const warns = await api<any[]>(`/api/warns?userId=${u.discordId}`).catch(() => []);
            const tickets = await api<any[]>(`/api/tickets/all?userId=${u.discordId}`).catch(() => []);
            return { ...u, warns, tickets };
          } catch {
            return u;
          }
        })
      );
      setUsers(enriched);
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const bl = async (id: string) => {
    try {
      await api("/api/blacklist", { method: "POST", body: JSON.stringify({ discordId: id, reason: "Dashboard" }) });
      load(search);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un utilisateur (ID ou nom)…" />
          <p className="text-xs text-muted-foreground mt-1">{users.length} utilisateur{users.length > 1 ? "s" : ""} trouvé{users.length > 1 ? "s" : ""}</p>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun utilisateur trouvé.</p>}
        {users.map((u) => (
          <Card key={u.discordId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{u.username}</span>
                    <span className="text-xs text-muted-foreground">({u.discordId})</span>
                    <Badge variant="secondary">Niv. {u.level}</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span><Trophy size={12} className="inline" /> {u.xp} XP</span>
                    <span><Star size={12} className="inline" /> {u.favorites.length} favoris</span>
                    <span>💬 {u.totalMsgs} messages</span>
                    <span><AlertTriangle size={12} className="inline" /> {u.warns?.length ?? 0} warn</span>
                    <span>🎫 {u.tickets?.filter((t) => t.status === "open").length || 0} tickets ouverts</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => window.location.href = `/messages?dm=${u.discordId}`}><MessageSquare size={14} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    const reason = prompt("Raison du warn :");
                    if (reason !== null) api("/api/warn", { method: "POST", body: JSON.stringify({ discordId: u.discordId, reason }) }).then(() => load(search));
                  }}><AlertTriangle size={14} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => bl(u.discordId)}><ShieldBan size={14} /></Button>
                </div>
              </div>
              {expanded === u.discordId && (
                <div className="mt-3 space-y-2 pt-3 border-t border-border">
                  <p className="text-xs font-semibold">Favoris : {u.favorites.length ? u.favorites.join(", ") : "aucun"}</p>
                  {u.warns && u.warns.length > 0 && <p className="text-xs text-amber-400">Warns : {u.warns.map((w) => w.reason).join(", ")}</p>}
                  {u.tickets && u.tickets.filter((t) => t.status === "open").length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {u.tickets.filter((t) => t.status === "open").map((tk) => (
                        <Badge key={tk.id} variant="outline">{tk.category}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button className="text-xs text-muted-foreground hover:text-foreground mt-1" onClick={() => setExpanded(expanded === u.discordId ? null : u.discordId)}>
                {expanded === u.discordId ? "Réduire" : "Voir plus"}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}