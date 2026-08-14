import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Search, ExternalLink } from "lucide-react";

interface Game {
  fileName: string;
  title: string;
  author: string;
  version: string;
  icon: string;
}

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (value: string) => {
    setQ(value);
    setLoading(true);
    try {
      const res = await fetch(`/api/games?search=${encodeURIComponent(value)}`, { credentials: "include" });
      if (res.ok) setGames(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Rechercher un jeu…" className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">…</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((g) => (
          <Card key={g.fileName}>
            <CardContent className="p-4 flex items-center gap-3">
              {g.icon && <img src={g.icon} alt="" className="w-12 h-12 rounded-lg object-contain bg-muted" />}
              <div className="min-w-0 flex-1">
                <a
                  className="font-semibold text-sm truncate block hover:text-primary"
                  href={`https://db-nds-shop.fr/game/${g.fileName}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {g.title}
                </a>
                <p className="text-xs text-muted-foreground truncate">{g.author} · {g.version}</p>
              </div>
              <ExternalLink size={14} className="text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
