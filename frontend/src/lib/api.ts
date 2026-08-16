// API wrapper — fetch simple vers les routes /api/* du bot (même origine ou proxy vite).
const API = import.meta.env.VITE_API_URL || "";

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (res.status === 401) {
    throw new ApiError("Unauthorized", 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || String(res.status), res.status);
  }
  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.message || data.error || "Identifiants invalides");
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API}/api/auth/sign-out`, { method: "POST", credentials: "include" }).catch(() => {});
}

// Types
export interface StatusData {
  bot: { online: boolean; username: string | null; uptime: number };
  guild: { id: string; name: string; memberCount: number } | null;
  games: number;
  user: { username: string; email: string };
}

export interface Channel { id: string; name: string; parent: string }
export interface Category { id: string; name: string; perms: unknown[]; channels: { id: string; name: string; perms: unknown[] }[] }

export async function listChannels(): Promise<Channel[]> {
  const cats = await api<Category[]>("/api/channels");
  return cats.flatMap((c) => c.channels.map((ch) => ({ id: ch.id, name: ch.name, parent: c.name })));
}
export interface Announcement { id: string; title: string; content: string; channel: string; status: string; createdAt: string; sentAt: string | null }
export interface Ticket { id: string; userId: string; username: string | null; category: string; status: string; createdAt: string; closedAt: string | null; messages: TicketMessage[] }
export interface TicketMessage { id: string; author: string; content: string; direction: string; createdAt: string }
export interface BotUser { discordId: string; username: string; xp: number; level: number; totalMsgs: number; favorites: string[] }
export interface BotLog { id: string; level: string; message: string; createdAt: string }
export interface CmdLog { id: string; userId: string; username: string | null; command: string; options: string | null; createdAt: string }
