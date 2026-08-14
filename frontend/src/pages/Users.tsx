import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api, type BotUser } from "../lib/api";

export default function Users() {
  const [users, setUsers] = useState<BotUser[]>([]);
  const [search, setSearch] = useState("");

  const load = async (s: string) => {
    try {
      const data = await api<BotUser[]>(`/api/users?search=${encodeURIComponent(s)}`);
      setUsers(data);
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par ID…" />
        </CardContent>
      </Card>
      <div className="space-y-2">
        {users.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {users.map((u) => (
          <Card key={u.discordId}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{u.username} <span className="text-xs text-muted-foreground">({u.discordId})</span></p>
                <p className="text-xs text-muted-foreground">
                  Niveau {u.level} · {u.xp} XP · {u.totalMsgs} messages · {u.favorites.length} favoris
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
