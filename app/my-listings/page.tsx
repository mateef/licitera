"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Listing = {
  id: string;
  title: string;
  current_price: number;
  ends_at: string;
  image_urls: string[] | null;
  image_paths: string[] | null;
};

export default function MyListingsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // hydrate-safe "now"
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  function timeLeftText(iso: string) {
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return "Lejárt";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const h = hours % 24;
      return `${days} nap ${h} óra`;
    }
    return `${hours} óra ${minutes} perc`;
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;
    setUid(userId);

    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }

    await loadMyListings(userId);
  }

  async function loadMyListings(userId: string) {
    const { data, error } = await supabase
      .from("listings")
      .select("id,title,current_price,ends_at,image_urls,image_paths")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setListings([]);
      setLoading(false);
      return;
    }

    setListings((data ?? []) as any);
    setLoading(false);
  }

  async function deleteListing(listingId: string) {
    if (!uid) return;

    try {
      // 1) lekérjük a listing image_paths-ait
      const { data: row, error: fetchErr } = await supabase
        .from("listings")
        .select("id,image_paths")
        .eq("id", listingId)
        .single();

      if (fetchErr) {
        toast.error(fetchErr.message);
        return;
      }

      const paths: string[] = (row as any)?.image_paths ?? [];

      // 2) töröljük a storage objektumokat (ha vannak)
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("listing-images").remove(paths);
        if (rmErr) {
          toast.error(`Képek törlése sikertelen: ${rmErr.message}`);
          return;
        }
      }

      // 3) töröljük a DB rekordot (RLS úgyis védi, hogy csak saját)
      const { error: delErr } = await supabase.from("listings").delete().eq("id", listingId);
      if (delErr) {
        toast.error(delErr.message);
        return;
      }

      toast.success("Aukció és képek törölve ✅");
      await loadMyListings(uid);
    } catch {
      toast.error("Váratlan hiba történt törlés közben.");
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => {
    const t = now;
    return listings.filter((l) => new Date(l.ends_at).getTime() > t).length;
  }, [listings, now]);

  const endedCount = useMemo(() => listings.length - activeCount, [listings.length, activeCount]);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saját aukciók</h1>
          <p className="text-sm text-muted-foreground">
            Itt látod az általad létrehozott aukciókat, és innen tudsz törölni.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/listings">Vissza a listához</a>
          </Button>
          <Button asChild>
            <a href="/create-listing">Új aukció</a>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Összesen: {listings.length}</Badge>
        <Badge>Aktív: {activeCount}</Badge>
        <Badge variant="outline">Lejárt: {endedCount}</Badge>
      </div>

      {/* Not logged in */}
      {!uid && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nem vagy bejelentkezve</CardTitle>
            <CardDescription>Jelentkezz be, hogy lásd a saját aukcióidat.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/login">Bejelentkezés</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/listings">Aukciók böngészése</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {uid && (
        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-44 w-full" />
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : listings.length === 0 ? (
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Még nincs aukciód</CardTitle>
                <CardDescription>Indíts egyet, és jelenni fog itt.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href="/create-listing">Aukció indítása</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/listings">Aukciók böngészése</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            listings.map((l) => {
              const ends = new Date(l.ends_at).getTime();
              const isActive = ends > now;
              const cover = l.image_urls?.[0] ?? null;

              return (
                <Card key={l.id} className="overflow-hidden transition hover:shadow-md">
                  <div className="relative">
                    {cover ? (
                      <a href={`/listing/${l.id}`}>
                        <img
                          src={cover}
                          alt={l.title}
                          className="h-44 w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                      </a>
                    ) : (
                      <div className="h-44 w-full bg-muted" />
                    )}

                    <div className="absolute left-3 top-3 flex gap-2">
                      {isActive ? <Badge>Aktív</Badge> : <Badge variant="destructive">Lejárt</Badge>}
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-base">
                      <a href={`/listing/${l.id}`} className="hover:underline">
                        {l.title}
                      </a>
                    </CardTitle>
                    <CardDescription>
                      Lejár: {new Date(l.ends_at).toLocaleString()} · Hátralévő idő:{" "}
                      <span className="font-medium text-foreground">{timeLeftText(l.ends_at)}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jelenlegi licit</span>
                      <span className="font-semibold">{formatHuf(l.current_price)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" asChild>
                        <a href={`/listing/${l.id}`}>Megnyitás</a>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Törlés</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Az aukció és a feltöltött képek is törlődnek. Ez a művelet nem visszavonható.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteListing(l.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Törlés
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}