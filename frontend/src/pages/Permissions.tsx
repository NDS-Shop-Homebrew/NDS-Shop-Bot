import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";

interface PermData {
  matrix: Record<string, string[]>;
  roles: string[];
  commands: string[];
}

// Hiérarchie des rôles (du moins au plus élevé)
const HIERARCHY = ["@everyone", "Member", "Contributor", "Tester", "Developer", "Moderator", "Admin"];

const CATEGORIES: { name: string; commands: string[] }[] = [
  { name: "Modération", commands: ["warn", "kick", "ban", "unban", "mute", "unmute", "lock", "unlock", "purge", "blacklist", "announce", "embed", "dm", "tickets", "levelconfig", "reload"] },
  { name: "Jeux & Catalogue", commands: ["game", "download", "random", "serial", "stats", "top", "favorites", "watch", "invite", "team"] },
  { name: "XP & Profil", commands: ["profile", "rank", "leaderboard", "remind"] },
  { name: "Support", commands: ["help", "ping", "report", "suggest"] },
];

function minLevel(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return "public";
  if (roles.includes("*") || roles.includes("@everyone")) return "public";
  for (let i = HIERARCHY.length - 1; i >= 1; i--) {
    if (roles.includes(HIERARCHY[i])) return HIERARCHY[i];
  }
  return "public";
}

function toMatrix(level: string): string[] {
  if (level === "public") return ["*"];
  const idx = HIERARCHY.indexOf(level);
  if (idx < 0) return ["*"];
  return HIERARCHY.slice(idx); // ce niveau et tous les supérieurs
}

export default function Permissions() {
  const [data, setData] = useState<PermData | null>(null);
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const d = await api<PermData>("/api/permissions");
      setData(d);
      const lv: Record<string, string> = {};
      for (const c of d.commands) lv[c] = minLevel(d.matrix[c]);
      setLevels(lv);
      setOpenCats(Object.fromEntries(CATEGORIES.map((c) => [c.name, true])));
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const matrix: Record<string, string[]> = {};
      for (const [cmd, lvl] of Object.entries(levels)) matrix[cmd] = toMatrix(lvl);
      await api("/api/permissions", { method: "PUT", body: JSON.stringify({ matrix }) });
      alert("Permissions enregistrées !");
    } catch {}
  };

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Permissions des commandes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Niveau minimum requis pour utiliser chaque commande. Les niveaux supérieurs sont automatiquement inclus.
              </p>
            </div>
            <Button onClick={save}>Enregistrer</Button>
          </div>
        </CardContent>
      </Card>

      {CATEGORIES.map((cat) => {
        const catCommands = cat.commands.filter((c) => data.commands.includes(c));
        if (catCommands.length === 0) return null;
        const restricted = catCommands.filter((c) => levels[c] !== "public").length;
        const open = openCats[cat.name];
        return (
          <Card key={cat.name}>
            <CardContent className="p-5 space-y-2">
              <button className="w-full flex items-center justify-between" onClick={() => setOpenCats((p) => ({ ...p, [cat.name]: !p[cat.name] }))}>
                <span className="font-semibold">{cat.name}</span>
                <Badge variant="secondary">{restricted}/{catCommands.length} restreintes</Badge>
              </button>
              {open && (
                <div className="space-y-2 pt-2">
                  {catCommands.map((cmd) => {
                    const isPublic = levels[cmd] === "public";
                    return (
                      <div key={cmd} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="text-sm">/{cmd}</code>
                          {isPublic && <Badge variant="outline">publique</Badge>}
                        </div>
                        <Select value={levels[cmd] || "public"} onValueChange={(v) => setLevels((p) => ({ ...p, [cmd]: v }))}>
                          <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public (tout le monde)</SelectItem>
                            {HIERARCHY.slice(1).map((r) => <SelectItem key={r} value={r}>{r}+</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}