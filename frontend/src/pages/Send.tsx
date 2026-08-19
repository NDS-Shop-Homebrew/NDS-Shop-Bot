import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, listChannels, type Channel } from "../lib/api";

export default function Send() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channel, setChannel] = useState("");
  const [content, setContent] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ch = await listChannels();
        setChannels(ch);
        if (ch.length) setChannel(ch[0].name);
      } catch {}
    })();
  }, []);

  const send = async () => {
    const ch = channels.find((c) => c.name === channel);
    if (!ch || !content.trim()) return;
    try {
      await api("/api/send", { method: "POST", body: JSON.stringify({ channelId: ch.id, content }) });
      setContent("");
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {}
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="font-semibold">Envoyer un message</h2>
        <div className="space-y-1.5">
          <Label>Salon</Label>
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
          <Label>Message (markdown)</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="font-mono"
          />
        </div>
        <Button variant="accent" className="w-full" onClick={send}>Envoyer</Button>
        {done && <p className="text-xs text-accent">✅ Envoyé !</p>}
      </CardContent>
    </Card>
  );
}
