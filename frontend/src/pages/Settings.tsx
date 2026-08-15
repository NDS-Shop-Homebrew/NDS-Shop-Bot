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

  useEffect(() => {
    (async () => {
      try {
        const s = await api<SettingsData>("/api/settings");
        setWelcome(s.welcomeMessage || "");
        setPoll(s.pollInterval || "300000");
        const l = await api<Leveling>("/api/leveling");
        setLeveling(l);
        setLevelEnabled(String(l.enabled));
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
