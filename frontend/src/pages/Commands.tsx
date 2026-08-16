import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, type CmdLog } from "../lib/api";

export default function Commands() {
  const [logs, setLogs] = useState<CmdLog[]>([]);
  const [search, setSearch] = useState("");
  const [cmd, setCmd] = useState("");

  const load = async (s: string, c: string) => {
    try {
      const q = new URLSearchParams({ limit: "200" });
      if (s) q.set("search", s);
      if (c) q.set("command", c);
      setLogs(await api<CmdLog[]>(`/api/commands?${q}`));
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => load(search, cmd), 300);
    return () => clearTimeout(t);
  }, [search, cmd]);

  const cmds = [...new Set(logs.map((l) => l.command))].sort();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold">Journal des commandes (qui a fait quoi)</h2>
          <div className="flex flex-wrap gap-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un utilisateur ou ID…" className="max-w-xs" />
            <Select value={cmd} onValueChange={(v) => setCmd(v === "all" ? "" : v)}>
              <SelectTrigger className="max-w-[200px]"><SelectValue placeholder="Commande" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {cmds.map((c) => <SelectItem key={c} value={c}>/{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-1">
        {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune commande.</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2 text-sm">
            <code className="text-accent font-medium shrink-0">/{l.command}</code>
            <span className="truncate flex-1 text-muted-foreground">
              <span className="text-foreground font-medium">{l.username || l.userId}</span>
              {l.options ? ` — ${l.options}` : ""}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}