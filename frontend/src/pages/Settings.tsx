import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api } from "../lib/api";

interface Leveling { enabled: boolean; xpPerMessage: number; excludedChannels: string[]; roles: { level: number; role: string }[] }

interface SettingsData { [key: string]: string }

export default function Settings() {
  const [leveling, setLeveling] = useState<Leveling>({ enabled: true, xpPerMessage: 15, excludedChannels: [], roles: [] });
  const [welcome, setWelcome] = useState("");
  const [poll, setPoll] = useState("300000");
  const [levelEnabled, setLevelEnabled] = useState("true");
  const [gameInfo, setGameInfo] = useState("");
  const [gameInfoCount, setGameInfoCount] = useState("5");
  const [warnMax, setWarnMax] = useState("3");
  const [warnAction, setWarnAction] = useState("kick");

  useEffect(() => {
    (async () => {
      try {
        const s = await api<SettingsData>("/api/settings");
        setWelcome(s.welcomeMessage || "");
        setPoll(s.pollInterval || "300000");
        setGameInfo(s.gameInfoTemplate || "");
        setGameInfoCount(s.gameInfoCount || "5");
        const l = await api<Leveling>("/api/leveling");
        setLeveling(l);
        setLevelEnabled(String(l.enabled));
        const wc = await api<{ max: number; action: string }>("/api/warn-config");
        setWarnMax(String(wc.max));
        setWarnAction(wc.action);
      } catch {}
    })();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    try {
      await api(`/api/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) });
    } catch {}
  };

  const saveLeveling = async () => {
    try {
      await api("/api/leveling", { method: "PUT", body: JSON.stringify({ ...leveling, enabled: levelEnabled === "true" }) });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">Réglages du bot</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Message de bienvenue (markdown)</Label>
              <textarea
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={() => saveSetting("welcomeMessage", welcome)}>Enregistrer</Button>
            </div>
            <div className="space-y-2">
              <Label>Intervalle scan jeux (ms)</Label>
              <Input type="number" value={poll} onChange={(e) => setPoll(e.target.value)} />
              <Button onClick={() => saveSetting("pollInterval", poll)}>Enregistrer</Button>
            </div>
            <div className="space-y-2">
              <Label>Leveling activé</Label>
              <Select value={levelEnabled} onValueChange={setLevelEnabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Oui</SelectItem>
                  <SelectItem value="false">Non</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={saveLeveling}>Enregistrer</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Template salon #game-info (dernier jeu ajouté)</Label>
            <textarea
              value={gameInfo}
              onChange={(e) => setGameInfo(e.target.value)}
              rows={5}
              placeholder="Variables : {{title}} {{author}} {{version}} {{systems}} {{titleId}} {{stars}} {{downloadUrl}} {{gameUrl}} {{updated}}"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Variables disponibles : <code>{"{{title}}"}</code> <code>{"{{author}}"}</code> <code>{"{{version}}"}</code> <code>{"{{systems}}"}</code> <code>{"{{titleId}}"}</code> <code>{"{{stars}}"}</code> <code>{"{{downloadUrl}}"}</code> <code>{"{{gameUrl}}"}</code> <code>{"{{updated}}"}</code> — la boxart et l'icône sont affichées automatiquement dans l'embed.</p>
            <Button onClick={() => saveSetting("gameInfoTemplate", gameInfo)}>Enregistrer</Button>
          </div>
          <div className="space-y-2">
            <Label>Nombre de jeux affichés dans #game-info</Label>
            <Input type="number" min={1} max={20} value={gameInfoCount} onChange={(e) => setGameInfoCount(e.target.value)} className="max-w-[120px]" />
            <Button onClick={() => saveSetting("gameInfoCount", gameInfoCount)}>Enregistrer</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label>Salons</Label>
              <Button variant="outline" onClick={async () => {
                try {
                  const r = await api<{ synced: number }>("/api/channels/sync", { method: "POST" });
                  alert(`Synchronisés : ${r.synced} salon(s)`);
                } catch {}
              }}>Synchroniser salons ↔ catégories</Button>
              <p className="text-xs text-muted-foreground">Fait hériter chaque salon des permissions de sa catégorie.</p>
            </div>
            <div className="space-y-2">
              <Label>Auto-action warns (seuil de warns actifs)</Label>
              <div className="flex gap-2 items-center">
                <Input type="number" value={warnMax} onChange={(e) => setWarnMax(e.target.value)} className="max-w-[80px]" />
                <Select value={warnAction} onValueChange={setWarnAction}>
                  <SelectTrigger className="max-w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kick">Kick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={async () => {
                  try {
                    await api("/api/warn-config", { method: "PUT", body: JSON.stringify({ max: Number(warnMax), action: warnAction }) });
                    alert("Config warns enregistrée !");
                  } catch {}
                }}>Enregistrer</Button>
              </div>
              <p className="text-xs text-muted-foreground">0 = jamais d'action automatique. L'action est déclenchée quand le nombre de warns non expirés atteint le seuil.</p>
            </div>
            <div className="space-y-2">
              <Label>Sauvegarde des réglages (backup)</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={async () => {
                  try {
                    const data = await api<any>("/api/settings/export");
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `nds-shop-bot-settings-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  } catch {}
                }}>Exporter</Button>
                <input type="file" accept=".json" className="hidden" id="settings-import" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const data = JSON.parse(await f.text());
                    const r = await api<{ imported: number }>("/api/settings/import", { method: "POST", body: JSON.stringify(data) });
                    alert(`Importé : ${r.imported} réglages`);
                  } catch { alert("Fichier invalide"); }
                  e.target.value = "";
                }} />
                <Button variant="outline" onClick={() => document.getElementById("settings-import")?.click()}>Importer</Button>
              </div>
              <p className="text-xs text-muted-foreground">Export/import JSON des BotSetting — pratique avant de modifier la config.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <Button variant="outline" onClick={async () => { try { await api("/api/reload", { method: "POST" }); alert("Configuration rechargée !"); } catch {} }}>
              Recharger les permissions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
