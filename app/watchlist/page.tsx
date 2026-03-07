"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  current_price: number;
  ends_at: string;
  image_urls: string[] | null;
  is_active: boolean;
  min_increment: number;
  categories: { name: string } | null;
};

function readWatchlistIds(): string[] {
  try {
    const raw = localStorage.getItem("watchlist") || "[]";
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

export default function WatchlistPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // live-ish time (for ending soon badge)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    setLoading(true);

    const nextIds = readWatchlistIds();
    setIds(nextIds);

    if (nextIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("listings")
      .select("id,title,description,current_price,ends_at,image_urls,is_active,min_increment,categories(name)")
      .in("id", nextIds)
      .order("ends_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // keep watchlist order
    const map = new Map((data ?? []).map((x: any) => [x.id, x]));
    const ordered = nextIds.map((id) => map.get(id)).filter(Boolean) as any[];
    setItems(ordered as Listing[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    function onStorage(e: StorageEvent) {
      if (e.key === "watchlist") load();
    }
    window.addEventListener("storage", onStorage);

    function onLocalChange() {
      load();
    }
    window.addEventListener("watchlist-changed", onLocalChange as any);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("watchlist-changed", onLocalChange as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeItems = useMemo(() => {
    return items.filter((l) => l.is_active && new Date(l.ends_at).getTime() > now);
  }, [items, now]);

  const endedItems = useMemo(() => {
    return items.filter((l) => !l.is_active || new Date(l.ends_at).getTime() <= now);
  }, [items, now]);

  function remove(id: string) {
    const next = ids.filter((x) => x !== id);
    localStorage.setItem("watchlist", JSON.stringify(next));
    setIds(next);
    setItems((prev) => prev.filter((x) => x.id !== id));
    window.dispatchEvent(new Event("watchlist-changed"));
    toast.success("Eltávolítva a figyelőlistáról");
  }

  function timeLeftText(iso: string) {
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return "Lejárt";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} nap`;
    }
    return `${hours}h ${minutes}m`;
  }

  function ListingCard({ l, ended }: { l: Listing; ended: boolean }) {
    const endingSoon = !ended && new Date(l.ends_at).getTime() - now < 1000 * 60 * 60;

    return (
      <Card className={`overflow-hidden transition hover:shadow-md ${ended ? "opacity-90" : ""}`}>
        {l.image_urls?.[0] ? (
          <div className="relative">
            <a href={`/listing/${l.id}`}>
              <img
                src={l.image_urls[0]}
                alt={l.title}
                className="h-44 w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
              />
            </a>

            {endingSoon && (
              <div className="absolute right-2 top-2">
                <Badge variant="destructive" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Ending soon
                </Badge>
              </div>
            )}

            {l.categories?.name && (
              <div className="absolute left-2 top-2">
                <Badge variant="secondary">{l.categories.name}</Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 bg-muted" />
        )}

        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            <a href={`/listing/${l.id}`} className="hover:underline line-clamp-2">
              {l.title}
            </a>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{ended ? "Last bid" : "Current bid"}</span>
            <span className="font-semibold">{formatHuf(l.current_price)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">{ended ? "Ended" : "Time left"}</span>
            <span className="font-medium">{ended ? new Date(l.ends_at).toLocaleString() : timeLeftText(l.ends_at)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button className="w-full" asChild>
              <a href={`/listing/${l.id}`}>Megnyitás</a>
            </Button>
            <Button className="w-full" variant="outline" onClick={() => remove(l.id)}>
              Törlés
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Figyelőlista</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/listings">Vissza a listához</a>
          </Button>
          <Button variant="secondary" onClick={load}>
            Frissítés
          </Button>
        </div>
      </div>

      {ids.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Még nincs semmi a figyelőlistádon. Nyiss meg egy aukciót és nyomd meg a “Figyelőlistára” gombot.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ACTIVE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Aktív</h2>
              <Badge variant="secondary">{activeItems.length}</Badge>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-44 w-full" />
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeItems.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Nincs aktív aukció a figyelőlistán.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {activeItems.map((l) => (
                  <ListingCard key={l.id} l={l} ended={false} />
                ))}
              </div>
            )}
          </div>

          {/* ENDED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Lejárt / lezárt</h2>
              <Badge variant="secondary">{endedItems.length}</Badge>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-44 w-full" />
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : endedItems.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Nincs lejárt/lezárt aukció a figyelőlistán.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {endedItems.map((l) => (
                  <ListingCard key={l.id} l={l} ended={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}