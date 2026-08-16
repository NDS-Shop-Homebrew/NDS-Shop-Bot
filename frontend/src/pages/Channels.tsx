import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

interface Perm { role: string; allow: string[]; deny: string[] }
interface Channel { id: string; name: string; perms: Perm[] }
interface Category { id: string; name: string; perms: Perm[]; channels: Channel[] }

export default function Channels() {
  const [cats, setCats] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCats(await api<Category[]>("/api/channels"));
      } catch {}
    })();
  }, []);

  const sync = async () => {
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; synced: number }>("/api/channels/sync", { method: "POST" });
      alert(`Synchronisés : ${r.synced} salon(s)`);
      setCats(await api<Category[]>("/api/channels"));
    } catch {}
    setBusy(false);
  };

  const short = (p: string) =>
    p
      .replace("ViewChannel", "Voir")
      .replace("SendMessages", "Envoyer")
      .replace("SendMessagesInThreads", "Envoyer (threads)")
      .replace("ManageMessages", "Gérer msgs")
      .replace("MentionEveryone", "@everyone")
      .replace("ManageChannels", "Gérer salon")
      .replace("CreateInstantInvite", "Invitations");

  const PermBadge = ({ p }: { p: Perm }) => (
    <div className="flex items-start gap-1 text-xs">
      <span className="font-medium whitespace-nowrap">{p.role}:</span>
      <div className="flex flex-wrap gap-1">
        {p.allow.map((a) => (
          <span key={a} className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-500">{short(a)}</span>
        ))}
        {p.deny.map((a) => (
          <span key={a} className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500">✕ {short(a)}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Salons & permissions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Arborescence réelle du serveur. La visibilité est définie au niveau des catégories ; les salons héritent.
              </p>
            </div>
            <Button onClick={sync} disabled={busy}>Synchroniser salons ↔ catégories</Button>
          </div>
        </CardContent>
      </Card>

      {cats.map((cat) => (
        <Card key={cat.id}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{cat.name}</span>
              <span className="text-xs text-muted-foreground">({cat.channels.length} salon{cat.channels.length > 1 ? "s" : ""})</span>
            </div>
            {cat.perms.length > 0 && (
              <div className="space-y-1 pl-2 border-l-2 border-border">
                {cat.perms.map((p, i) => <PermBadge key={i} p={p} />)}
              </div>
            )}
            <div className="space-y-2 pl-2">
              {cat.channels.map((ch) => (
                <div key={ch.id} className={cn("rounded-md border border-border/60 p-3", ch.name === "game-info" && "border-primary/50")}>
                  <span className="text-sm font-medium">#{ch.name}</span>
                  {ch.perms.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {ch.perms.map((p, i) => <PermBadge key={i} p={p} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}