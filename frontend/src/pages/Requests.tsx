import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";

interface RequestRow {
  threadId: string;
  title: string;
  status: string;
  discordId: string;
  username: string;
  createdAt: string;
}
interface RequestsResponse { guildId: string | null; forumId: string | null; requests: RequestRow[] }

const STATUSES = ["Tous", "Demandé", "Ajouté", "Refusé", "Doublon"];

export default function Requests() {
  const [data, setData] = useState<RequestsResponse | null>(null);
  const [filter, setFilter] = useState<string>("Tous");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      setData(await api<RequestsResponse>(`/api/requests${filter !== "Tous" ? `?status=${encodeURIComponent(filter)}` : ""}`));
    } catch (e: any) {
      setErr(e.message || "Erreur");
    }
  };

  useEffect(() => { load(); }, [filter]);

  const setStatus = async (r: RequestRow, status: string) => {
    if (!confirm(`Passer « ${r.title} » au statut ${status} ?\nLe demandeur sera notifié en MP.`)) return;
    try {
      await api(`/api/requests/${r.threadId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      load();
    } catch (e: any) {
      setErr(e.message || "Erreur");
    }
  };

  const postUrl = (r: RequestRow) =>
    data?.guildId && data?.forumId ? `https://discord.com/channels/${data.guildId}/${data.forumId}/${r.threadId}` : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="space-y-3">
        {!data && !err && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {data?.requests.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {data?.requests.map((r) => (
          <Card key={r.threadId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.title}</span>
                    <Badge variant={r.status === "Demandé" ? "accent" : "secondary"}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.username} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {r.status !== "Ajouté" && (
                    <Button size="sm" onClick={() => setStatus(r, "Ajouté")}>Ajouté</Button>
                  )}
                  {r.status !== "Refusé" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r, "Refusé")}>Refusé</Button>
                  )}
                  {r.status !== "Doublon" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r, "Doublon")}>Doublon</Button>
                  )}
                  {postUrl(r) && (
                    <a href={postUrl(r)!} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline self-center">
                      Post
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}