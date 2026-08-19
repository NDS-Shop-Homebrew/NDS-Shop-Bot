import { useEffect, useState } from "react";
import { marked } from "marked";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { api, listChannels, type Announcement, type Channel } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Announcements() {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [content, setContent] = useState("");

  const load = async () => {
    try { setItems(await api<Announcement[]>("/api/announcements")); } catch {}
    try {
      const ch = await listChannels();
      setChannels(ch);
      if (!channel && ch.length) setChannel(ch[0].name);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!title || !content || !channel) return;
    try {
      await api("/api/announcements", { method: "POST", body: JSON.stringify({ title, content, channel }) });
      setTitle(""); setContent("");
      load();
    } catch {}
  };

  const send = async (id: string) => {
    try { await api(`/api/announcements/${id}/send`, { method: "POST" }); load(); } catch {}
  };

  const remove = async (id: string) => {
    try { await api(`/api/announcements/${id}`, { method: "DELETE" }); load(); } catch {}
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">Nouvelle annonce (markdown)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{"Titre"}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
              </div>
              <div className="space-y-1.5">
                <Label>{"Salon"}</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger><SelectValue placeholder="Salon" /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.parent} / #{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{"Contenu (markdown)"}</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="font-mono"
                  placeholder="**Écrivez votre annonce en markdown…**"
                />
              </div>
              <Button className="w-full" onClick={save}>Enregistrer</Button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Préview embed Discord</p>
              <div className="rounded-lg bg-[#2b2d31] border-l-4 border-[#0099ff] p-4 min-h-[280px] overflow-hidden">
                {title && <div className="text-white font-semibold mb-2">{title}</div>}
                <div
                  className="text-sm text-[#dbdee1] prose prose-sm max-w-none prose-invert"
                  dangerouslySetInnerHTML={{ __html: marked.parse(content || "*Aperçu…*") }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{a.title}</span>
                  <Badge variant={a.status === "sent" ? "accent" : "secondary"}>{a.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  #{a.channel} · {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => send(a.id)}>Envoyer</Button>
                {isSuperAdmin && (
                  <Button size="sm" variant="destructive" onClick={() => remove(a.id)}>Suppr.</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
