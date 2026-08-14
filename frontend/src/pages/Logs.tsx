import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { api, type BotLog } from "../lib/api";

export default function Logs() {
  const [logs, setLogs] = useState<BotLog[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLogs(await api<BotLog[]>("/api/logs?limit=100"));
      } catch {}
    })();
  }, []);

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-semibold mb-3">Journal d'activité</h2>
        <div className="space-y-1 text-sm font-mono max-h-[60vh] overflow-y-auto">
          {logs.map((l) => (
            <p
              key={l.id}
              className={
                l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-400" : "text-muted-foreground"
              }
            >
              [{new Date(l.createdAt).toLocaleString()}] {l.message}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
