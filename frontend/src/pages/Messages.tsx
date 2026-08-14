import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Send, Mail, Search } from "lucide-react";
import { api } from "../lib/api";

interface Contact {
  id: string;
  discordId: string;
  username: string;
  lastMessage: string | null;
  lastAt: string;
  unreadCount: number;
}
interface DmMessage {
  id: string;
  direction: string;
  author: string;
  content: string;
  createdAt: string;
}
interface Thread { contact: Contact | null; messages: DmMessage[] }
interface Member { id: string; username: string; display: string; avatar: string }

export default function Messages() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [thread, setThread] = useState<DmMessage[]>([]);
  const [reply, setReply] = useState("");
  // nouveau MP
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [newTarget, setNewTarget] = useState<Member | null>(null);
  const [newMsg, setNewMsg] = useState("");

  const loadContacts = async () => {
    try {
      const c = await api<Contact[]>("/api/dm/contacts");
      setContacts(c);
      if (c.length && !active) setActive(c[0]);
    } catch {}
  };

  useEffect(() => { loadContacts(); }, []);

  const openThread = async (c: Contact) => {
    setActive(c);
    try {
      const t = await api<Thread>(`/api/dm/contacts/${c.discordId}/messages`);
      setThread(t.messages);
      loadContacts();
    } catch {}
  };

  useEffect(() => {
    if (active) openThread(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    try {
      await api("/api/dm", { method: "POST", body: JSON.stringify({ userId: active.discordId, content: reply }) });
      setReply("");
      openThread(active);
    } catch {}
  };

  const searchMembers = async (q: string) => {
    setMemberQuery(q);
    if (q.trim().length < 2) { setMembers([]); return; }
    try {
      const m = await api<Member[]>(`/api/members?search=${encodeURIComponent(q)}`);
      setMembers(m);
    } catch {}
  };

  const sendNew = async () => {
    if (!newTarget || !newMsg.trim()) return;
    try {
      await api("/api/dm", { method: "POST", body: JSON.stringify({ userId: newTarget.id, content: newMsg }) });
      setNewMsg(""); setNewTarget(null); setMemberQuery(""); setMembers([]);
      loadContacts();
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Liste des contacts */}
      <Card>
        <CardContent className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          <h2 className="font-semibold px-1">Conversations</h2>
          {contacts.length === 0 && <p className="text-sm text-muted-foreground px-1">Personne n'a encore contacté le bot.</p>}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => openThread(c)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${active?.discordId === c.discordId ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{c.username}</span>
                {c.unreadCount > 0 && <Badge variant="destructive">{c.unreadCount}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage || "—"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.lastAt).toLocaleString()}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Fil de conversation */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          {active ? (
            <>
              <h2 className="font-semibold">{active.username} <span className="text-xs text-muted-foreground">({active.discordId})</span></h2>
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {thread.length === 0 && <p className="text-sm text-muted-foreground">Aucun message.</p>}
                {thread.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "staff" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.direction === "staff" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="text-xs opacity-70">{m.author} · {new Date(m.createdAt).toLocaleString()}</p>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Réponse (envoyée en DM)…" />
                <Button onClick={sendReply}><Send size={15} /></Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Choisissez une conversation.</p>
          )}
        </CardContent>
      </Card>

      {/* Nouveau MP */}
      <Card className="lg:col-span-3">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Mail size={16} /> Nouveau message privé</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input value={memberQuery} onChange={(e) => searchMembers(e.target.value)} placeholder="Rechercher un membre…" className="pl-9" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {newTarget && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setNewTarget(null)}>
                  {newTarget.username} ✕
                </Badge>
              )}
              {members.length > 0 && !newTarget && (
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(e) => {
                    const m = members.find((x) => x.id === e.target.value);
                    if (m) setNewTarget(m);
                    setMembers([]);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Choisir…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.username} ({m.display})</option>
                  ))}
                </select>
              )}
            </div>
            <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendNew()} placeholder="Message…" disabled={!newTarget} />
            <Button onClick={sendNew} disabled={!newTarget || !newMsg.trim()}><Send size={15} /> Envoyer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
