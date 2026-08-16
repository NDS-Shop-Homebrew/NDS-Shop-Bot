import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";
import { Trophy } from "lucide-react";

interface LeaderUser { discordId: string; username: string; xp: number; level: number; totalMsgs: number }

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setUsers(await api<LeaderUser[]>("/api/users?limit=50"));
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">…</p>;
  if (users.length === 0) return <p className="text-sm text-muted-foreground">Pas encore de classement.</p>;

  const maxXp = Math.max(...users.map((u) => u.xp), 1);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold flex items-center gap-2"><Trophy size={16} className="text-amber-500" /> Classement — XP</h2>
        </CardContent>
      </Card>
      {users.map((u, i) => (
        <Card key={u.discordId}>
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-lg font-bold w-7 text-center shrink-0">{medals[i] || i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{u.username}</span>
                <Badge variant="secondary">Niv. {u.level}</Badge>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${Math.max((u.xp / maxXp) * 100, 2)}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{u.xp.toLocaleString()} XP</p>
              <p className="text-xs text-muted-foreground">{u.totalMsgs} messages</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}