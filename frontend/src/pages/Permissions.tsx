import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { api } from "../lib/api";

interface PermData {
  matrix: Record<string, string[]>;
  roles: string[];
  commands: string[];
}

export default function Permissions() {
  const [data, setData] = useState<PermData | null>(null);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});

  const load = async () => {
    try {
      const d = await api<PermData>("/api/permissions");
      setData(d);
      setMatrix(JSON.parse(JSON.stringify(d.matrix)));
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const toggle = (cmd: string, role: string, checked: boolean) => {
    setMatrix((prev) => {
      const arr = [...(prev[cmd] || [])];
      if (checked && !arr.includes(role)) arr.push(role);
      if (!checked && arr.includes(role)) arr.splice(arr.indexOf(role), 1);
      return { ...prev, [cmd]: arr };
    });
  };

  const save = async () => {
    try {
      await api("/api/permissions", { method: "PUT", body: JSON.stringify({ matrix }) });
    } catch {}
  };

  if (!data) return null;

  const commands = (data.commands || Object.keys(matrix)).sort();
  const displayRoles = data.roles.filter((r) => r !== "@everyone");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold">Matrice de permissions (rôle → commande)</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {commands.map((cmd) => (
              <div key={cmd} className="flex items-start gap-3 border-b border-border/50 pb-2">
                <code className="text-sm w-40 shrink-0 pt-1">/{cmd}</code>
                <div className="flex flex-wrap gap-4">
                  {displayRoles.map((role) => {
                    const checked = (matrix[cmd] || []).includes(role) || (matrix[cmd] || []).includes("*") || (matrix[cmd] || []).includes("@everyone");
                    return (
                      <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggle(cmd, role, !!v)} />
                        {role}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <Button onClick={save}>Enregistrer</Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Un membre passe s'il a au moins un de ces rôles. Le rôle le plus élevé du membre décide.
      </p>
    </div>
  );
}
