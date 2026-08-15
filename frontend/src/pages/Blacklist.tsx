import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ShieldBan, X, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

interface BlItem {
  id: string;
  discordId: string;
  reason: string | null;
  createdAt: string;
}

export default function Blacklist() {
  const [items, setItems] = useState<BlItem[]>([]);
  const [newId, setNewId] = useState("");
  const [newReason, setNewReason] = useState("");

  const load = async () => {
    try {
      setItems(await api<BlItem[]>("/api/blacklist"));
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newId.trim()) return;
    try {
      await api("/api/blacklist", { method: "POST", body: JSON.stringify({ discordId: newId.trim(), reason: newReason }) });
      setNewId(""); setNewReason("");
      load();
    } catch (err) {
      alert(err);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Retirer cet utilisateur de la blacklist ?")) return;
    try {
      await api(`/api/blacklist/${id}`, { method: "DELETE" });
      load();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShieldBan size={16} /> Ajouter un utilisateur à la blacklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>ID Discord</Label>
              <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="123456789012345678" />
            </div>
            <div className="space-y-1">
              <Label>Raison (optionnelle)</Label>
              <Input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Spam / Abus…" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="destructive" onClick={add} disabled={!newId.trim()}>
                <ShieldBan size={14} /> Bannir du bot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <ShieldBan size={16} /> Utilisateurs bannis du bot
            <Badge variant="destructive">{items.length}</Badge>
          </h2>
          {items.length === 0 && <p className="text-sm text-muted-foreground">Aucun utilisateur banni.</p>}
          <div className="space-y-2">
            {items.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{b.discordId}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.reason || "Aucune raison"} · {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(b.discordId)}>
                  <X size={14} /> Retirer
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><AlertTriangle size={16} /> Avertissements (warns)</h2>
          <p className="text-xs text-muted-foreground">Les warns sont visibles sur la page Utilisateurs (onglet Utilisateurs).</p>
        </CardContent>
      </Card>
    </div>
  );
}