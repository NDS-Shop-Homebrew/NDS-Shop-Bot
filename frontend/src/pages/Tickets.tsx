import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { api, type Ticket } from "../lib/api";

interface TicketStats { open: number; closed: number; total: number; byCategory: { category: string; _count: { _all: number } }[] }

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [replyTarget, setReplyTarget] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);

  const load = async () => {
    try {
      const data = await api<Ticket[]>(`/api/tickets?status=${filter}`);
      setTickets(data);
    } catch {}
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    (async () => {
      try { setStats(await api<TicketStats>("/api/tickets/stats")); } catch {}
      try { setTemplates(await api<string[]>("/api/ticket-templates")); } catch {}
    })();
  }, []);

  const doReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    try {
      await api(`/api/tickets/${replyTarget.id}/reply`, { method: "POST", body: JSON.stringify({ content: replyText }) });
      setReplyTarget(null);
      setReplyText("");
      load();
    } catch {}
  };

  const close = async (id: string) => {
    try { await api(`/api/tickets/${id}/close`, { method: "POST" }); load(); } catch {}
  };

  const reopen = async (id: string) => {
    try { await api(`/api/tickets/${id}/reopen`, { method: "POST" }); load(); } catch {}
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="accent">{stats.open} ouvert{stats.open > 1 ? "s" : ""}</Badge>
          <Badge variant="secondary">{stats.closed} fermé{stats.closed > 1 ? "s" : ""}</Badge>
          {stats.byCategory.map((c) => (
            <Badge key={c.category} variant="outline">{c.category} : {c._count._all}</Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {(["open", "closed", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {tickets.map((tk) => (
          <Card key={tk.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tk.category}</span>
                    <span className="text-sm text-muted-foreground truncate">— {tk.username || tk.userId}</span>
                    <Badge variant={tk.status === "open" ? "accent" : "secondary"}>{tk.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(tk.createdAt).toLocaleString()} · <code className="text-[11px]">{tk.id}</code>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {tk.status === "open" ? (
                    <>
                      <Button size="sm" onClick={() => setReplyTarget(tk)}>Répondre</Button>
                      <Button size="sm" variant="destructive" onClick={() => close(tk.id)}>Fermer</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="accent" onClick={() => reopen(tk.id)}>Rouvrir</Button>
                  )}
                </div>
              </div>
              {tk.messages?.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    {tk.messages.length} message{tk.messages.length > 1 ? "s" : ""}
                  </summary>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto text-xs">
                    {tk.messages.map((m) => (
                      <p key={m.id}>
                        <span className={m.direction === "staff" ? "text-accent font-semibold" : "font-semibold"}>
                          {m.direction === "staff" ? "🛡️ " : ""}{m.author}
                        </span>
                        : {m.content}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {replyTarget && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold">Répondre à {replyTarget.username || replyTarget.userId} (envoyé en DM)</p>
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl, i) => (
                  <Button key={i} size="sm" variant="outline" onClick={() => setReplyText(tpl)}>
                    {tpl.length > 40 ? tpl.slice(0, 40) + "…" : tpl}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="ghost" onClick={async () => {
                const tpl = prompt("Nouvelle réponse rapide :");
                if (tpl && tpl.trim()) {
                  const next = [...templates, tpl.trim()];
                  await api("/api/ticket-templates", { method: "PUT", body: JSON.stringify({ templates: next }) });
                  setTemplates(next);
                }
              }}>+ Ajouter un template</Button>
              {templates.length > 0 && (
                <Button size="sm" variant="ghost" onClick={async () => {
                  const next = templates.slice(0, -1);
                  await api("/api/ticket-templates", { method: "PUT", body: JSON.stringify({ templates: next }) });
                  setTemplates(next);
                }}>Supprimer le dernier</Button>
              )}
            </div>
            <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Votre réponse…" />
            <div className="flex gap-2">
              <Button onClick={doReply}>Envoyer</Button>
              <Button variant="ghost" onClick={() => { setReplyTarget(null); setReplyText(""); }}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
