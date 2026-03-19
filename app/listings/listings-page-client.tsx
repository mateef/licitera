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
  seller_rating?: number | null;
  seller_review_count?: number | null;
  is_featured?: boolean;
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

type SellerPlanRow = {
  id: string;
  subscription_tier?: "free" | "standard" | "pro" | null;
};

type RatingSummaryRow = {
  user_id: string;
  average_rating: number | null;
  review_count: number | null;
};

const settlementItems = settlements as SettlementItem[];
const PAGE_SIZE = 24;

const FEATURED_CATEGORY_NAMES = [
  { title: "Elektronika", icon: "📱" },
  { title: "Jármű", icon: "🚗" },
  { title: "Otthon és kert", icon: "🏡" },
  { title: "Divat", icon: "👜" },
  { title: "Sport és szabadidő", icon: "🏂" },
  { title: "Gyerek és baba", icon: "🧸" },
];

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

function SearchableDropdown({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 10);
    return options
      .filter((item) => item.toLowerCase().includes(q))
      .slice(0, 10);
  }, [options, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="space-y-2" ref={wrapRef}>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          className="h-11 rounded-xl"
        />

        {open && !disabled && filtered.length > 0 && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
            {filtered.map((item) => (
              <button
                key={item}
                type="button"
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"ending" | "price_desc" | "price_asc" | "new">("ending");
  const [loadError, setLoadError] = useState("");

  const [countyInput, setCountyInput] = useState("");
  const [cityInput, setCityInput] = useState("");

  const [page, setPage] = useState(1);

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

  const county = useMemo(() => {
    return HUNGARIAN_COUNTIES.includes(countyInput as any) ? countyInput : "";
  }, [countyInput]);

  const availableCities = useMemo(() => {
    if (!county) return [];
    return settlementItems
      .filter((item) => item.county === county)
      .map((item) => item.city)
      .sort((a, b) => a.localeCompare(b, "hu"));
  }, [county]);

  const city = useMemo(() => {
    return availableCities.includes(cityInput) ? cityInput : "";
  }, [availableCities, cityInput]);

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

  const featuredCategoryCards = useMemo(() => {
    return FEATURED_CATEGORY_NAMES.map((item) => {
      const match = catsL1.find((c) => c.name === item.title);
      return {
        ...item,
        id: match?.id ?? "",
      };
    }).filter((x) => x.id);
  }, [catsL1]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
          user_id,is_active,
          min_increment,county,city,delivery_mode,buy_now_price,category_id,
          categories(id,name),
          bids(count)
        `,
          { count: "exact" }
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
        setTotalCount(0);
        setLoadError(error.message);
        return;
      }

      let formatted: Listing[] =
        data?.map((l: any) => ({
          ...l,
          bid_count: l.bids?.[0]?.count ?? 0,
          seller_rating: null,
          seller_review_count: 0,
          is_featured: false,
        })) ?? [];

      if (selectedCategoryIds.length > 0) {
        formatted = formatted.filter(
          (l: Listing) => l.category_id && selectedCategoryIds.includes(l.category_id)
        );
      }

      const sellerIds = Array.from(
        new Set(formatted.map((l) => l.user_id).filter(Boolean))
      ) as string[];

      let sellerPlanMap: Record<string, "free" | "standard" | "pro" | null> = {};
      let sellerRatingMap: Record<
        string,
        { average_rating: number | null; review_count: number | null }
      > = {};

      if (sellerIds.length > 0) {
        const [{ data: sellerPlans }, { data: ratingRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,subscription_tier")
            .in("id", sellerIds),
          supabase
            .from("user_rating_summary")
            .select("user_id,average_rating,review_count")
            .in("user_id", sellerIds),
        ]);

        (sellerPlans ?? []).forEach((row: SellerPlanRow) => {
          sellerPlanMap[row.id] = row.subscription_tier ?? null;
        });

        (ratingRows ?? []).forEach((row: RatingSummaryRow) => {
          sellerRatingMap[row.user_id] = {
            average_rating: row.average_rating,
            review_count: row.review_count,
          };
        });
      }

      formatted = formatted.map((l) => {
        const rating = l.user_id ? sellerRatingMap[l.user_id] : null;
        const tier = l.user_id ? sellerPlanMap[l.user_id] : null;

        return {
          ...l,
          seller_rating: rating?.average_rating ?? null,
          seller_review_count: rating?.review_count ?? 0,
          is_featured: tier === "pro",
        };
      });
            formatted.sort((a, b) => {
        if (!!a.is_featured !== !!b.is_featured) {
          return a.is_featured ? -1 : 1;
        }
        return 0;
      });

      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;

      setTotalCount(formatted.length);
      setListings(formatted.slice(start, end));
    } catch (e: any) {
      if (reqId !== listingsReqIdRef.current) return;
      setListings([]);
      setTotalCount(0);
      setLoadError(e?.message ?? "Ismeretlen hiba történt a betöltés közben.");
    } finally {
      if (reqId !== listingsReqIdRef.current) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    const pageParam = Number(searchParams.get("page") ?? "1");
    setPage(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);
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
    setCityInput("");
  }, [countyInput]);

  useEffect(() => {
    setPage(1);
  }, [q, countyInput, cityInput, catL1, catL2, catL3, minPrice, maxPrice, sort]);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();

      if (trimmed) params.set("q", trimmed);
      else params.delete("q");

      if (page > 1) params.set("page", String(page));
      else params.delete("page");

      router.replace(`/listings?${params.toString()}`);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(() => loadListings(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, finalCategoryId, minPrice, maxPrice, sort, county, city, selectedCategoryIds.join("|"), page]);

  const hasAnyFilter =
    !!q.trim() || !!finalCategoryId || !!minPrice || !!maxPrice || !!countyInput || !!cityInput;

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
              Találatok ezen az oldalon: <span className="font-semibold text-slate-900">{listings.length}</span>
            </div>
          </div>
        </div>

        {featuredCategoryCards.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {featuredCategoryCards.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCatL1(item.id);
                  setCatL2("");
                  setCatL3("");
                }}
                className="flex items-center justify-between rounded-[1.5rem] border border-white/70 bg-white/75 px-4 py-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <div className="text-sm text-slate-500">Népszerű kategória</div>
                  </div>
                </div>

                <div className="text-slate-400">→</div>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                <SearchableDropdown
                  label="Vármegye"
                  placeholder="Kezdd el írni..."
                  value={countyInput}
                  onChange={setCountyInput}
                  options={[...HUNGARIAN_COUNTIES]}
                />

                <SearchableDropdown
                  label="Település"
                  placeholder={county ? "Kezdd el írni..." : "Előbb válassz vármegyét"}
                  value={cityInput}
                  onChange={setCityInput}
                  options={availableCities}
                  disabled={!county}
                />
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
                  setCountyInput("");
                  setCityInput("");
                  setCatL1("");
                  setCatL2("");
                  setCatL3("");
                  setMinPrice("");
                  setMaxPrice("");
                  setPage(1);
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

              {countyInput && (
                <Badge variant="outline" className="cursor-pointer rounded-full px-3 py-1" onClick={() => setCountyInput("")}>
                  Vármegye: {countyInput} ✕
                </Badge>
              )}

              {cityInput && (
                <Badge variant="outline" className="cursor-pointer rounded-full px-3 py-1" onClick={() => setCityInput("")}>
                  Település: {cityInput} ✕
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
                    setCountyInput("");
                    setCityInput("");
                    setCatL1("");
                    setCatL2("");
                    setCatL3("");
                    setMinPrice("");
                    setMaxPrice("");
                    setPage(1);
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
                        setCountyInput("");
                        setCityInput("");
                        setCatL1("");
                        setCatL2("");
                        setCatL3("");
                        setMinPrice("");
                        setMaxPrice("");
                        setPage(1);
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
                    className={`group overflow-hidden rounded-[1.75rem] border transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)]
                      ${
                        l.is_featured
                          ? "border-amber-300 bg-gradient-to-br from-white to-amber-50 shadow-[0_0_0_2px_rgba(251,191,36,0.25),0_18px_40px_rgba(15,23,42,0.08)]"
                          : "border-slate-200/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                      }`}
                  >
                    <div className="relative">
                      <a href={`/listing/${l.id}`} className="block overflow-hidden">
                        {l.image_urls?.[0] ? (
                          <img
                            src={l.image_urls[0]}
                            className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.04] sm:h-56"
                            alt={l.title}
                          />
                        ) : (
                          <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
                            Nincs kép
                          </div>
                        )}
                      </a>

                      <div className="absolute left-3 top-3 right-[108px] flex flex-wrap gap-2 pr-2">
                        {l.is_featured && (
                          <Badge className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-amber-400 sm:px-3 sm:text-xs">
  KIEMELT
</Badge>
                        )}

                        {l.categories?.name && (
                          <Badge className="rounded-full border-white/20 bg-black/45 px-2.5 py-1 text-[11px] text-white backdrop-blur sm:px-3 sm:text-xs">
  {l.categories.name}
</Badge>
                        )}

                        {endingSoon && (
                          <Badge variant="destructive" className="rounded-full px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs">
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
  className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm backdrop-blur hover:bg-white sm:px-3 sm:text-sm"
  title={isWatched ? "Levétel a figyelőlistáról" : "Hozzáadás a figyelőlistához"}
>
  {isWatched ? "✓ Mentve" : "♡ Mentés"}
</button>
                    </div>

                    <CardHeader className="space-y-3 px-4 pb-3 pt-4 sm:px-6">
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

                          {l.seller_rating !== null && l.seller_rating !== undefined ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                              ⭐ {l.seller_rating.toFixed(1)} ({l.seller_review_count ?? 0})
                            </span>
                          ) : null}
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

                        <div className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-right">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Licitek
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {l.bid_count ?? 0}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 px-4 pb-4 pt-0 text-sm sm:px-6 sm:pb-6">
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

          {!loading && totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:flex-row">
              <div className="text-sm text-slate-600">
                Oldal <span className="font-semibold text-slate-900">{page}</span> / {totalPages}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Előző
                </Button>

                <Button
                  className="rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Következő
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}