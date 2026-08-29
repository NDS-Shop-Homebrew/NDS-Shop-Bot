import { API_BASE_URL } from "../config.js";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function listGames(): Promise<Game[]> {
  const games = await get<Game[]>("/games.json");
  try {
    const full = await get<FullGame[]>("/data/full.json");
    const arr: FullGame[] = Array.isArray(full) ? full : (Object.values(full) as FullGame[]);
    const boxartByTitle = new Map<string, string>();
    for (const f of arr) {
      const boxart = f.screenshots?.find((s) => s.description === "Boxart")?.url;
      if (boxart) boxartByTitle.set(f.title, boxart);
    }
    for (const g of games) g.boxart = boxartByTitle.get(g.title) || null;
  } catch {}
  return games;
}

export async function metadata(serial: string): Promise<GameMetadata> {
  return get(`/api/v1/ndsdb/metadata/${encodeURIComponent(serial)}`);
}

export async function stats() {
  return get("/api/v1/stats");
}

export async function teamIds() {
  return get<{ members: { id: string; role?: string }[] }>("/api/v1/team");
}

export async function presence(id: string): Promise<{ discord_status: string }> {
  return get(`/api/v1/discord-presence/${id}`);
}

interface Game {
  title: string;
  fileName: string;
  author?: string;
  version?: string;
  systems?: string[];
  titleId?: string;
  updated?: string;
  icon?: string;
  stars?: string;
  downloads?: Record<string, { url: string }>;
  screenshots?: { description?: string; url?: string }[];
  qr?: Record<string, string>;
  boxart?: string | null;
}

interface FullGame {
  title: string;
  screenshots?: { description?: string; url?: string }[];
}

interface GameMetadata {
  name?: string;
  formal_name?: string;
  description?: string;
  description_fr?: string;
  description_en?: string;
  description_igdb?: string;
  product_code?: string;
  region?: string;
  developer?: string;
  publisher?: string;
  release_date?: string;
  genres?: string[];
  rating_system?: { name?: string; age?: number };
  media?: {
    icon?: string;
    front_boxart?: string;
    screenshots?: { compiled?: string[] };
  };
}
