import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface RequestRow {
  threadId: string;
  title: string;
  status: string;
  discordId: string;
  username: string;
  createdAt: string;
}
interface RequestsResponse { guildId: string | null; forumId: string | null; requests: RequestRow[] }

const STATUSES = ["Tous", "Demandé", "Ajouté", "Refusé", "Doublon"];

export default function Requests() {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<RequestsResponse | null>(null);
  const [filter, setFilter] = useState<string>("Tous");
  const [err, setErr] = useState("");
  const [toDelete, setToDelete] = useState<RequestRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setErr("");
    try {
      setData(await api<RequestsResponse>(`/api/requests${filter !== "Tous" ? `?status=${encodeURIComponent(filter)}` : ""}`));
    } catch (e: any) {
      setErr(e.message || "Erreur");
    }
  };

  useEffect(() => { load(); }, [filter]);

  const setStatus = async (r: RequestRow, status: string) => {
    if (!confirm(`Passer « ${r.title} » au statut ${status} ?\nLe demandeur sera notifié en MP.`)) return;
    try {
      await api(`/api/requests/${r.threadId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      load();
    } catch (e: any) {
      setErr(e.message || "Erreur");
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/requests/${toDelete.threadId}`, { method: "DELETE" });
      setToDelete(null);
      load();
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const postUrl = (r: RequestRow) =>
    data?.guildId && data?.forumId ? `https://discord.com/channels/${data.guildId}/${data.forumId}/${r.threadId}` : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>
      {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
      <div className="space-y-3">
        {!data && !err && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}
        {data?.requests.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {data?.requests.map((r) => (
          <Card key={r.threadId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.title}</span>
                    <Badge variant={r.status === "Demandé" ? "accent" : "secondary"}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.username} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {r.status !== "Ajouté" && (
                    <Button size="sm" onClick={() => setStatus(r, "Ajouté")}>Ajouté</Button>
                  )}
                  {r.status !== "Refusé" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r, "Refusé")}>Refusé</Button>
                  )}
                  {r.status !== "Doublon" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r, "Doublon")}>Doublon</Button>
                  )}
                  {postUrl(r) && (
                    <a href={postUrl(r)!} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline self-center">
                      Post
                    </a>
                  )}
                  {isSuperAdmin && (
                    <Button size="sm" variant="destructive" onClick={() => setToDelete(r)}>Supprimer</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la demande</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.title} » — le post sera retiré du forum Discord et la demande supprimée de la liste. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={doDelete}>
              {busy ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}