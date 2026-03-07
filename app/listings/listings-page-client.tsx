"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
import { formatHuf } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";


type Listing = {
  id: string;
  title: string;
  description: string | null;
  current_price: number;
  ends_at: string;
  image_urls: string[] | null;
  user_id: string | null;
  is_active: boolean;
  min_increment: number;
  bid_count?: number;
  categories: { id: string; name: string } | null;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
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

function toggleWatchlistId(id: string): { watched: boolean; ids: string[] } {
  const prev = readWatchlistIds();
  const watched = prev.includes(id);
  const next = watched ? prev.filter((x) => x !== id) : [...prev, id];
  try {
    localStorage.setItem("watchlist", JSON.stringify(next));
  } catch {}
  try {
    window.dispatchEvent(new Event("watchlist-changed"));
  } catch {}
  return { watched: !watched, ids: next };
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"ending" | "price_desc" | "price_asc" | "new">("ending");
  const [loadError, setLoadError] = useState<string>("");

  // ✅ request-id védelem (race condition ellen)
  const listingsReqIdRef = useRef(0);

  // 3-szint kategóriák
  const [catsL1, setCatsL1] = useState<Category[]>([]);
  const [catsL2, setCatsL2] = useState<Category[]>([]);
  const [catsL3, setCatsL3] = useState<Category[]>([]);
  const [catL1, setCatL1] = useState("");
  const [catL2, setCatL2] = useState("");
  const [catL3, setCatL3] = useState("");

  const finalCategoryId = useMemo(() => {
    return catL3 || catL2 || catL1 || "";
  }, [catL1, catL2, catL3]);

  // watchlist state (client-only)
  const [mounted, setMounted] = useState(false);
  const [watchIds, setWatchIds] = useState<string[]>([]);

  // hydrate-safe "now"
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  function getTimeLeft(date: string) {
    const diff = new Date(date).getTime() - now;
    if (diff <= 0) return "Lejárt";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} nap`;
    }

    return `${hours} óra ${minutes} perc`;
  }

  async function loadLevel1() {
    const { data } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    setCatsL1((data ?? []) as any);
  }

  async function loadChildren(parentId: string) {
    const { data } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .eq("parent_id", parentId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    return (data ?? []) as Category[];
  }

  async function loadCategories() {
    await loadLevel1();
  }

  async function loadListings() {
    const reqId = ++listingsReqIdRef.current;

    // csak az aktuális kérés állíthatja loading-ot
    setLoading(true);
    setLoadError("");

    try {
      let query = supabase
        .from("listings")
        .select(
          `
          id,title,description,current_price,ends_at,image_urls,
          min_increment,
          categories(id,name),
          bids(count)
        `
        )
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString());

      const qq = q.trim();
      if (qq) query = query.ilike("title", `%${qq}%`);
      if (finalCategoryId) query = query.eq("category_id", finalCategoryId);

      const minP = Number(minPrice);
      if (minPrice && !Number.isNaN(minP)) query = query.gte("current_price", minP);

      const maxP = Number(maxPrice);
      if (maxPrice && !Number.isNaN(maxP)) query = query.lte("current_price", maxP);

      if (sort === "ending") query = query.order("ends_at", { ascending: true });
      if (sort === "price_desc") query = query.order("current_price", { ascending: false });
      if (sort === "price_asc") query = query.order("current_price", { ascending: true });
      if (sort === "new") query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      // ✅ ha közben jött újabb kérés, ezt ignoráljuk
      if (reqId !== listingsReqIdRef.current) return;

      if (error) {
        setListings([]);
        setLoadError(error.message);
        return;
      }

      const formatted =
        data?.map((l: any) => ({
          ...l,
          bid_count: l.bids?.[0]?.count ?? 0,
        })) ?? [];

      setListings(formatted);
    } catch (e: any) {
      if (reqId !== listingsReqIdRef.current) return;
      setListings([]);
      setLoadError(e?.message ?? "Ismeretlen hiba történt a betöltés közben.");
    } finally {
      if (reqId !== listingsReqIdRef.current) return;
      setLoading(false);
    }
  }

  // URL -> state (pl. /listings?q=iphone)
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  // init
  useEffect(() => {
    loadCategories();
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // watchlist init + sync
  useEffect(() => {
    setMounted(true);
    setWatchIds(readWatchlistIds());

    function onStorage(e: StorageEvent) {
      if (e.key === "watchlist") setWatchIds(readWatchlistIds());
    }
    function onLocalChange() {
      setWatchIds(readWatchlistIds());
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("watchlist-changed", onLocalChange as any);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("watchlist-changed", onLocalChange as any);
    };
  }, []);

  // 3-szint: amikor L1 változik -> L2 betölt + reset L2/L3
  useEffect(() => {
    async function run() {
      setCatsL2([]);
      setCatsL3([]);
      setCatL2("");
      setCatL3("");

      if (!catL1) return;

      const children = await loadChildren(catL1);
      setCatsL2(children);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catL1]);

  // 3-szint: amikor L2 változik -> L3 betölt + reset L3
  useEffect(() => {
    async function run() {
      setCatsL3([]);
      setCatL3("");

      if (!catL2) return;

      const children = await loadChildren(catL2);
      setCatsL3(children);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catL2]);

  // state -> URL (csak q-t synceljük)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();

      if (trimmed) params.set("q", trimmed);
      else params.delete("q");

      router.replace(`/listings?${params.toString()}`);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // reload listings on filters (debounced)
  useEffect(() => {
    const t = setTimeout(() => loadListings(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, finalCategoryId, minPrice, maxPrice, sort]);

  const hasAnyFilter = !!q.trim() || !!finalCategoryId || !!minPrice || !!maxPrice;

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* SIDEBAR */}
      <div className="space-y-4 lg:col-span-1">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Input placeholder="Keresés..." value={q} onChange={(e) => setQ(e.target.value)} />

            {/* 3 szintű kategória */}
            <div className="space-y-2">
              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={catL1}
                onChange={(e) => setCatL1(e.target.value)}
              >
                <option value="">Főkategória</option>
                {catsL1.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={catL2}
                onChange={(e) => setCatL2(e.target.value)}
                disabled={!catL1 || catsL2.length === 0}
              >
                <option value="">Alkategória</option>
                {catsL2.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={catL3}
                onChange={(e) => setCatL3(e.target.value)}
                disabled={!catL2 || catsL3.length === 0}
              >
                <option value="">Típus</option>
                {catsL3.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input placeholder="Minimum ár" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <Input placeholder="Maximum ár" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </CardContent>
        </Card>
      </div>

      {/* TOP ROW: BADGES + SORT + GRID */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {q && (
              <Badge variant="outline" className="cursor-pointer" onClick={() => setQ("")}>
                Keresés: {q} ✕
              </Badge>
            )}

            {finalCategoryId && (
              <Badge
                variant="outline"
                onClick={() => {
                  setCatL1("");
                  setCatL2("");
                  setCatL3("");
                }}
                className="cursor-pointer"
              >
                Kategória ✕
              </Badge>
            )}

            {minPrice && (
              <Badge variant="outline" onClick={() => setMinPrice("")} className="cursor-pointer">
                Minimum: {minPrice} ✕
              </Badge>
            )}
            {maxPrice && (
              <Badge variant="outline" onClick={() => setMaxPrice("")} className="cursor-pointer">
                Maximum: {maxPrice} ✕
              </Badge>
            )}
            {hasAnyFilter && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  setQ("");
                  setCatL1("");
                  setCatL2("");
                  setCatL3("");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                Szűrők törlése
              </Badge>
            )}
          </div>

          <select
            className="h-10 rounded-md border px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="ending">Hamarosan lejár</option>
            <option value="new">Legújabb</option>
            <option value="price_desc">Legmagasabb ár</option>
            <option value="price_asc">Legalacsonyabb ár</option>
          </select>
        </div>

        {loadError ? (
          <Card>
            <CardHeader>
              <CardTitle>Hiba történt a betöltésnél</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div>{loadError}</div>
              <Button variant="outline" onClick={loadListings}>
                Újrapróbálom
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : listings.length === 0 ? (
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Nincs találat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Próbáld meg más kulcsszóval, vagy lazíts a szűrőkön.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ("");
                      setCatL1("");
                      setCatL2("");
                      setCatL3("");
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                  >
                    Szűrők törlése
                  </Button>
                  <Button asChild>
                    <a href="/create-listing">Eladok valamit</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            listings.map((l) => {
              const timeLeft = getTimeLeft(l.ends_at);
              const endingSoon = new Date(l.ends_at).getTime() - now < 1000 * 60 * 60;
              const minNext = l.current_price + l.min_increment;

              const isWatched = mounted ? watchIds.includes(l.id) : false;

              return (
                <Card key={l.id} className="overflow-hidden transition hover:shadow-md">
                  {l.image_urls?.[0] && (
                    <div className="relative">
                      <a href={`/listing/${l.id}`}>
                        <img
                          src={l.image_urls[0]}
                          className="h-48 w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                          alt={l.title}
                        />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const res = toggleWatchlistId(l.id);
                          setWatchIds(res.ids);
                        }}
                        className="absolute right-3 top-3 rounded-full border bg-background/90 px-3 py-1 text-sm backdrop-blur hover:bg-background"
                        title={isWatched ? "Levétel a figyelőlistáról" : "Hozzáadás a figyelőlistához"}
                      >
                        {isWatched ? "✓ Mentve" : "♡ Mentés"}
                      </button>
                    </div>
                  )}

                  {l.categories?.name && (
                    <div className="px-6 pt-4">
                      <Badge variant="secondary" className="text-xs">
                        {l.categories.name}
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-base">
                      <a href={`/listing/${l.id}`} className="hover:underline">
                        {l.title}
                      </a>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jelenlegi licit</span>
                      <span className="font-semibold">{formatHuf(l.current_price)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Következő minimum</span>
                      <span className="font-medium">{formatHuf(minNext)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hátralévő idő</span>
                      <span className="font-medium">{timeLeft}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Licit</span>
                      <span>{l.bid_count ?? 0}</span>
                    </div>

                    {endingSoon && <Badge variant="destructive">Hamarosan lejár</Badge>}

                    <Button className="w-full mt-2" asChild>
                      <a href={`/listing/${l.id}`}>Megnyitás</a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}