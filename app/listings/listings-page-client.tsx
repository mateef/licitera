"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import settlements from "@/data/hungary-settlements.json";
import { HUNGARIAN_COUNTIES, DELIVERY_MODES } from "@/lib/hungary";
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
  county: string;
  city: string;
  delivery_mode: string;
  buy_now_price: number | null;
  category_id?: string | null;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
};

type SettlementItem = {
  city: string;
  county: string;
};

const settlementItems = settlements as SettlementItem[];

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

function getDeliveryModeLabel(value: string) {
  return DELIVERY_MODES.find((x) => x.value === value)?.label ?? value;
}

function buildDescendantIds(allCategories: Category[], rootId: string): string[] {
  const result = new Set<string>();
  const childrenByParent = new Map<string, string[]>();

  for (const cat of allCategories) {
    if (!cat.parent_id) continue;
    const prev = childrenByParent.get(cat.parent_id) ?? [];
    prev.push(cat.id);
    childrenByParent.set(cat.parent_id, prev);
  }

  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    result.add(current);

    const children = childrenByParent.get(current) ?? [];
    for (const childId of children) {
      if (!result.has(childId)) {
        stack.push(childId);
      }
    }
  }

  return Array.from(result);
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
  const [loadError, setLoadError] = useState("");

  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");

  const listingsReqIdRef = useRef(0);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catL1, setCatL1] = useState("");
  const [catL2, setCatL2] = useState("");
  const [catL3, setCatL3] = useState("");

  const [mounted, setMounted] = useState(false);
  const [watchIds, setWatchIds] = useState<string[]>([]);

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const catsL1 = useMemo(
    () =>
      allCategories
        .filter((c) => c.parent_id === null)
        .sort(
          (a, b) =>
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
            a.name.localeCompare(b.name, "hu")
        ),
    [allCategories]
  );

  const catsL2 = useMemo(
    () =>
      allCategories
        .filter((c) => c.parent_id === catL1)
        .sort(
          (a, b) =>
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
            a.name.localeCompare(b.name, "hu")
        ),
    [allCategories, catL1]
  );

  const catsL3 = useMemo(
    () =>
      allCategories
        .filter((c) => c.parent_id === catL2)
        .sort(
          (a, b) =>
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
            a.name.localeCompare(b.name, "hu")
        ),
    [allCategories, catL2]
  );

  const finalCategoryId = useMemo(() => {
    return catL3 || catL2 || catL1 || "";
  }, [catL1, catL2, catL3]);

  const selectedCategoryIds = useMemo(() => {
    if (!finalCategoryId) return [];
    return buildDescendantIds(allCategories, finalCategoryId);
  }, [allCategories, finalCategoryId]);

  const availableCities = useMemo(() => {
    if (!county) return [];
    return settlementItems
      .filter((item) => item.county === county)
      .map((item) => item.city)
      .sort((a, b) => a.localeCompare(b, "hu"));
  }, [county]);

  useEffect(() => {
    setCity("");
  }, [county]);

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

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setAllCategories([]);
      return;
    }

    setAllCategories((data ?? []) as Category[]);
  }

  async function loadListings() {
    const reqId = ++listingsReqIdRef.current;
    setLoading(true);
    setLoadError("");

    try {
      let query = supabase
        .from("listings")
        .select(
          `
          id,title,description,current_price,ends_at,image_urls,
          min_increment,county,city,delivery_mode,buy_now_price,category_id,
          categories(id,name),
          bids(count)
        `
        )
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString());

      const qq = q.trim();
      if (qq) query = query.ilike("title", `%${qq}%`);

      if (county) query = query.eq("county", county);
      if (city) query = query.eq("city", city);

      const minP = Number(minPrice);
      if (minPrice && !Number.isNaN(minP)) query = query.gte("current_price", minP);

      const maxP = Number(maxPrice);
      if (maxPrice && !Number.isNaN(maxP)) query = query.lte("current_price", maxP);

      if (sort === "ending") query = query.order("ends_at", { ascending: true });
      if (sort === "price_desc") query = query.order("current_price", { ascending: false });
      if (sort === "price_asc") query = query.order("current_price", { ascending: true });
      if (sort === "new") query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (reqId !== listingsReqIdRef.current) return;

      if (error) {
        setListings([]);
        setLoadError(error.message);
        return;
      }

      let formatted =
        data?.map((l: any) => ({
          ...l,
          bid_count: l.bids?.[0]?.count ?? 0,
        })) ?? [];

      if (selectedCategoryIds.length > 0) {
        formatted = formatted.filter(
          (l: any) => l.category_id && selectedCategoryIds.includes(l.category_id)
        );
      }

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

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    loadCategories();
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    setCatL2("");
    setCatL3("");
  }, [catL1]);

  useEffect(() => {
    setCatL3("");
  }, [catL2]);

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

  useEffect(() => {
    const t = setTimeout(() => loadListings(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, finalCategoryId, minPrice, maxPrice, sort, county, city, selectedCategoryIds.join("|")]);

  const hasAnyFilter =
    !!q.trim() || !!finalCategoryId || !!minPrice || !!maxPrice || !!county || !!city;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.9),rgba(255,255,255,0.96),rgba(245,208,254,0.75))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
              Aukciók
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Találd meg a következő nyertes licitet
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Modern, gyors és átlátható aukciós felület, jobb szűréssel, tisztább
              kártyákkal és sokkal erősebb mobilos élménnyel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700 backdrop-blur">
              Aktív találatok: <span className="font-semibold text-slate-900">{listings.length}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Szűrők</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Keresés</label>
                <Input
                  placeholder="Mit keresel?"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Vármegye</label>
                  <select
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                  >
                    <option value="">Összes</option>
                    {HUNGARIAN_COUNTIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Település</label>
                  <select
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!county}
                  >
                    <option value="">{county ? "Összes" : "Előbb válassz vármegyét"}</option>
                    {availableCities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Főkategória</label>
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                  value={catL1}
                  onChange={(e) => setCatL1(e.target.value)}
                >
                  <option value="">Összes</option>
                  {catsL1.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Alkategória</label>
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  value={catL2}
                  onChange={(e) => setCatL2(e.target.value)}
                  disabled={!catL1 || catsL2.length === 0}
                >
                  <option value="">Összes</option>
                  {catsL2.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Típus</label>
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  value={catL3}
                  onChange={(e) => setCatL3(e.target.value)}
                  disabled={!catL2 || catsL3.length === 0}
                >
                  <option value="">Összes</option>
                  {catsL3.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Minimum ár</label>
                  <Input
                    placeholder="0 Ft"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Maximum ár</label>
                  <Input
                    placeholder="Pl. 50 000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                className="h-11 w-full rounded-xl"
                onClick={() => {
                  setQ("");
                  setCounty("");
                  setCity("");
                  setCatL1("");
                  setCatL2("");
                  setCatL3("");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                Szűrők törlése
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {q && (
                <Badge variant="outline" className="cursor-pointer rounded-full px-3 py-1" onClick={() => setQ("")}>
                  Keresés: {q} ✕
                </Badge>
              )}

              {county && (
                <Badge variant="outline" className="cursor-pointer rounded-full px-3 py-1" onClick={() => setCounty("")}>
                  Vármegye: {county} ✕
                </Badge>
              )}

              {city && (
                <Badge variant="outline" className="cursor-pointer rounded-full px-3 py-1" onClick={() => setCity("")}>
                  Település: {city} ✕
                </Badge>
              )}

              {finalCategoryId && (
                <Badge
                  variant="outline"
                  className="cursor-pointer rounded-full px-3 py-1"
                  onClick={() => {
                    setCatL1("");
                    setCatL2("");
                    setCatL3("");
                  }}
                >
                  Kategória ✕
                </Badge>
              )}

              {minPrice && (
                <Badge
                  variant="outline"
                  className="cursor-pointer rounded-full px-3 py-1"
                  onClick={() => setMinPrice("")}
                >
                  Minimum: {minPrice} ✕
                </Badge>
              )}

              {maxPrice && (
                <Badge
                  variant="outline"
                  className="cursor-pointer rounded-full px-3 py-1"
                  onClick={() => setMaxPrice("")}
                >
                  Maximum: {maxPrice} ✕
                </Badge>
              )}

              {hasAnyFilter && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer rounded-full px-3 py-1"
                  onClick={() => {
                    setQ("");
                    setCounty("");
                    setCity("");
                    setCatL1("");
                    setCatL2("");
                    setCatL3("");
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                >
                  Mindent törlök
                </Badge>
              )}
            </div>

            <select
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
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
            <Card className="rounded-[1.5rem] border-red-200 bg-red-50/70 shadow-none">
              <CardHeader>
                <CardTitle>Hiba történt a betöltésnél</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-red-700">
                <div>{loadError}</div>
                <Button variant="outline" onClick={loadListings}>
                  Újrapróbálom
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-[1.75rem] border-slate-200/80">
                  <Skeleton className="h-52 w-full" />
                  <CardHeader className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ))
            ) : listings.length === 0 ? (
              <Card className="sm:col-span-2 xl:col-span-3 rounded-[1.75rem] border-slate-200/80">
                <CardHeader>
                  <CardTitle>Nincs találat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Próbáld meg más kulcsszóval, vagy lazíts a szűrőkön.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQ("");
                        setCounty("");
                        setCity("");
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
                  <Card
                    key={l.id}
                    className="group overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="relative">
                      <a href={`/listing/${l.id}`} className="block overflow-hidden">
                        {l.image_urls?.[0] ? (
                          <img
                            src={l.image_urls[0]}
                            className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                            alt={l.title}
                          />
                        ) : (
                          <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
                            Nincs kép
                          </div>
                        )}
                      </a>

                      <div className="absolute left-3 top-3 flex gap-2">
                        {l.categories?.name && (
                          <Badge className="rounded-full border-white/20 bg-black/45 px-3 py-1 text-white backdrop-blur">
                            {l.categories.name}
                          </Badge>
                        )}
                        {endingSoon && (
                          <Badge variant="destructive" className="rounded-full px-3 py-1">
                            Hamarosan lejár
                          </Badge>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const res = toggleWatchlistId(l.id);
                          setWatchIds(res.ids);
                        }}
                        className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/85 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur hover:bg-white"
                        title={isWatched ? "Levétel a figyelőlistáról" : "Hozzáadás a figyelőlistához"}
                      >
                        {isWatched ? "✓ Mentve" : "♡ Mentés"}
                      </button>
                    </div>

                    <CardHeader className="space-y-3 pb-3">
                      <div className="space-y-2">
                        <CardTitle className="line-clamp-2 text-lg leading-6">
                          <a href={`/listing/${l.id}`} className="transition hover:text-primary">
                            {l.title}
                          </a>
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {l.county} · {l.city}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {getDeliveryModeLabel(l.delivery_mode)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Jelenlegi licit
                          </div>
                          <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                            {formatHuf(l.current_price)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Licitek
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {l.bid_count ?? 0}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Következő minimum
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {formatHuf(minNext)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Hátralévő idő
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">{timeLeft}</div>
                        </div>
                      </div>

                      {l.buy_now_price ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-emerald-700">
                            Villámár
                          </div>
                          <div className="mt-1 font-semibold text-emerald-900">
                            {formatHuf(l.buy_now_price)}
                          </div>
                        </div>
                      ) : null}

                      {l.description && (
                        <p className="line-clamp-2 leading-6 text-slate-600">{l.description}</p>
                      )}

                      <Button className="h-11 w-full rounded-xl" asChild>
                        <a href={`/listing/${l.id}`}>Megnyitás</a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}