import { useEffect, useState } from "react";
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
  const [filtered, setFiltered] = useState<Game[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/games?search=", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setGames(data);
          setFiltered(data);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const search = (value: string) => {
    setQ(value);
    const s = value.toLowerCase();
    setFiltered(games.filter((g) => g.title.toLowerCase().includes(s) || g.author.toLowerCase().includes(s)));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Rechercher un jeu…" className="pl-9" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {filtered.length} / {games.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>}
      {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun jeu trouvé.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((g) => (
          <Card key={g.fileName}>
            <CardContent className="p-4 flex items-center gap-3">
              {g.icon && <img src={g.icon} alt="" className="w-12 h-12 rounded-lg object-contain bg-muted shrink-0" />}
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
      <p className="text-xs text-muted-foreground text-center">{filtered.length} jeu{filtered.length > 1 ? "x" : ""} affiché{filtered.length > 1 ? "s" : ""}</p>
    </div>
  );
}