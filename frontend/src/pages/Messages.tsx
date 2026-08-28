import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Send, Mail, Search, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Contact {
  id: string; discordId: string; username: string; lastMessage: string | null; lastAt: string; unreadCount: number;
}
interface DmMessage { id: string; direction: string; author: string; content: string; createdAt: string; }
interface Thread { contact: Contact | null; messages: DmMessage[] }
interface Member { id: string; username: string; display: string; avatar: string }

export default function Messages() {
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [thread, setThread] = useState<DmMessage[]>([]);
  const [reply, setReply] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [newTarget, setNewTarget] = useState<Member | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const memberBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (memberBoxRef.current && !memberBoxRef.current.contains(e.target as Node)) setMemberOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadContacts = async () => {
    try {
      const c = await api<Contact[]>("/api/dm/contacts");
      setContacts(c);
      const dmId = searchParams.get("dm");
      if (dmId) {
        const ex = c.find((x) => x.discordId === dmId);
        if (ex) { if (!active || active.discordId !== dmId) openThread(ex); }
        else if (!active) setNewTarget({ id: dmId, username: "", display: dmId, avatar: "" });
      } else if (c.length && !active) setActive(c[0]);
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

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    try {
      await api("/api/dm", { method: "POST", body: JSON.stringify({ userId: active.discordId, content: reply }) });
      setReply(""); openThread(active);
    } catch {}
  };

  const openMemberSearch = async () => {
    setMemberOpen(true);
    if (members.length) return;
    try { setMembers(await api<Member[]>("/api/members?search=")); } catch {}
  };

  const filteredMembers = members.filter((m) => {
    const q = memberQuery.trim().toLowerCase();
    return !q || m.username.toLowerCase().includes(q) || m.display.toLowerCase().includes(q) || m.id.includes(q);
  });

  const sendNew = async () => {
    if (!newTarget || !newMsg.trim()) return;
    try {
      await api("/api/dm", { method: "POST", body: JSON.stringify({ userId: newTarget.id, content: newMsg }) });
      setNewMsg(""); setNewTarget(null); setMemberQuery(""); setMembers([]);
      loadContacts();
    } catch {}
  };

  const deleteConversation = async (discordId: string) => {
    if (!confirm("Supprimer toute la conversation ?")) return;
    try {
      await api(`/api/dm/${discordId}`, { method: "DELETE" });
      if (active?.discordId === discordId) { setActive(null); setThread([]); }
      loadContacts();
    } catch {}
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await api(`/api/dm/messages/${msgId}`, { method: "DELETE" });
      setThread((prev) => prev.filter((m) => m.id !== msgId));
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          <h2 className="font-semibold px-1 flex items-center justify-between">
            Conversations
            <span className="text-xs text-muted-foreground">{contacts.filter((c) => c.unreadCount > 0).length} non lu(s)</span>
          </h2>
          {contacts.length === 0 && <p className="text-sm text-muted-foreground px-1">Personne n'a encore contacté le bot.</p>}
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <button
                onClick={() => openThread(c)}
                className={`flex-1 text-left p-3 rounded-lg border transition-colors ${active?.discordId === c.discordId ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{c.username}</span>
                  {c.unreadCount > 0 && <Badge variant="destructive">{c.unreadCount}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.lastAt).toLocaleString()}</p>
              </button>
              {isSuperAdmin && (
                <Button variant="ghost" size="icon" onClick={() => deleteConversation(c.discordId)} className="text-muted-foreground hover:text-red-400 shrink-0">
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          {active ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{active.username} <span className="text-xs text-muted-foreground">({active.discordId})</span></h2>
                {isSuperAdmin && (
                  <button onClick={() => deleteConversation(active.discordId)} className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1">
                    <Trash2 size={12} /> Supprimer
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {thread.length === 0 && <p className="text-sm text-muted-foreground">Aucun message.</p>}
                {thread.map((m) => (
                  <div key={m.id} className="group flex gap-1 items-start">
                    <div className={`flex-1 ${m.direction === "staff" ? "flex justify-end" : ""}`}>
                      <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm relative ${m.direction === "staff" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-xs opacity-70">{m.author} · {new Date(m.createdAt).toLocaleString()}</p>
                        <p className="whitespace-pre-wrap wrap-break-word">{m.content}</p>
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 shrink-0 mt-1">
                        <X size={12} />
                      </Button>
                    )}
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

      <Card className="lg:col-span-3">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Mail size={16} /> Nouveau message privé</h2>
          {newTarget && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-secondary">
              {newTarget.avatar && <img src={newTarget.avatar} alt="" className="w-10 h-10 rounded-full" />}
              <div className="flex-1">
                <p className="font-semibold text-sm">{newTarget.display || newTarget.id}</p>
                <p className="text-xs text-muted-foreground">@{newTarget.username} · <Badge variant="accent">Membre du serveur</Badge></p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewTarget(null)}>✕ Changer</Button>
            </div>
          )}
          {!newTarget && (
            <div ref={memberBoxRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input value={memberQuery} onChange={(e) => { setMemberQuery(e.target.value); setMemberOpen(true); }} onFocus={openMemberSearch} placeholder="Rechercher un membre du serveur…" className="pl-9" />
              {memberOpen && (
                <div className="absolute z-30 mt-2 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {filteredMembers.length === 0 && <p className="p-3 text-sm text-muted-foreground">Aucun membre trouvé.</p>}
                  {filteredMembers.map((m) => (
                    <button key={m.id} onClick={() => { setNewTarget(m); setMembers([]); setMemberOpen(false); }} className="w-full flex items-center gap-3 p-2.5 hover:bg-muted transition-colors text-left">
                      <img src={m.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{m.display}</p>
                        <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">Serveur</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendNew()} placeholder={newTarget ? `Message pour ${newTarget.display}…` : "Choisissez d'abord un destinataire…"} disabled={!newTarget} />
            <Button onClick={sendNew} disabled={!newTarget || !newMsg.trim()}><Send size={15} /> Envoyer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}