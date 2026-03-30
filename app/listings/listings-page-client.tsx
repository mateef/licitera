"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import settlements from "@/data/hungary-settlements.json";
import { HUNGARIAN_COUNTIES, DELIVERY_MODES } from "@/lib/hungary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { formatHuf } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Search,
  Sparkles,
  MapPin,
  Clock3,
  Gavel,
  SlidersHorizontal,
  ChevronRight,
  Star,
  LayoutGrid,
  X,
  Heart,
  PlusSquare,
  Filter,
  ArrowUpRight,
} from "lucide-react";

type ListingCategory = { id: string; name: string };

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
  categories: ListingCategory | ListingCategory[] | null;
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
  level?: number | null;
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

const HOME_CATEGORIES = [
  { key: "Elektronika", label: "Elektronika", emoji: "📱" },
  { key: "Jármű és alkatrész", label: "Jármű és alkatrész", emoji: "🚗" },
  { key: "Otthon és kert", label: "Otthon és kert", emoji: "🏡" },
  { key: "Divat és kiegészítők", label: "Divat és kiegészítők", emoji: "👜" },
  { key: "Sport és szabadidő", label: "Sport és szabadidő", emoji: "🏂" },
  { key: "Gyerek és baba", label: "Gyerek és baba", emoji: "🧸" },
];

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  Elektronika: "📱",
  "Jármű és alkatrész": "🚗",
  "Otthon és kert": "🏡",
  "Divat és kiegészítők": "👜",
  "Sport és szabadidő": "🏂",
  "Gyerek és baba": "🧸",
  "Mezőgazdaság és ipar": "🔧",
  "Szépség és egészség": "💄",
  "Iroda és üzlet": "📚",
  "Hobbi, játék, gyűjtés": "🎮",
  Ékszer: "💍",
  Bútor: "🛋️",
  Kert: "🌿",
  Szerszám: "🧰",
  Állat: "🐶",
};

function getCategoryName(category: Listing["categories"]) {
  if (!category) return "";
  if (Array.isArray(category)) return category[0]?.name ?? "";
  return category.name ?? "";
}

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
      if (!result.has(childId)) stack.push(childId);
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
    return options.filter((item) => item.toLowerCase().includes(q)).slice(0, 10);
  }, [options, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
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
          className="h-11 rounded-2xl border-slate-200 bg-white shadow-sm"
        />

        {open && !disabled && filtered.length > 0 && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
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

function SectionHeader({
  title,
  actionLabel,
  onPress,
}: {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>

      {actionLabel && onPress ? (
        <button
          type="button"
          onClick={onPress}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary transition hover:opacity-80"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function QuickChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CategoryCard({
  label,
  emoji,
  onPress,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="relative min-h-[126px] rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
        {emoji}
      </div>

      <div className="pt-14">
        <div className="text-base font-extrabold text-slate-900">{label}</div>
        <div className="mt-1 text-sm text-slate-500">Népszerű kategória</div>
      </div>
    </button>
  );
}

export default function ListingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [allLoadedListings, setAllLoadedListings] = useState<Listing[]>([]);
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
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name, "hu")
        ),
    [allCategories]
  );

  const catsL2 = useMemo(
    () =>
      allCategories
        .filter((c) => c.parent_id === catL1)
        .sort(
          (a, b) =>
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name, "hu")
        ),
    [allCategories, catL1]
  );

  const catsL3 = useMemo(
    () =>
      allCategories
        .filter((c) => c.parent_id === catL2)
        .sort(
          (a, b) =>
            (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name, "hu")
        ),
    [allCategories, catL2]
  );

  const finalCategoryId = useMemo(() => catL3 || catL2 || catL1 || "", [catL1, catL2, catL3]);

  const selectedCategoryIds = useMemo(() => {
    if (!finalCategoryId) return [];
    return buildDescendantIds(allCategories, finalCategoryId);
  }, [allCategories, finalCategoryId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const selectedCategoryName =
    catsL3.find((c) => c.id === catL3)?.name ||
    catsL2.find((c) => c.id === catL2)?.name ||
    catsL1.find((c) => c.id === catL1)?.name ||
    "";

  const featuredCategoryCards = useMemo(() => {
    return HOME_CATEGORIES.map((item) => {
      const match = catsL1.find((c) => c.name === item.key);
      return {
        ...item,
        id: match?.id ?? "",
      };
    }).filter((x) => x.id);
  }, [catsL1]);

  const visibleModalCategories = useMemo(() => {
    return catsL1.map((category) => ({
      ...category,
      emoji: CATEGORY_EMOJI_MAP[category.name] ?? "🏷️",
    }));
  }, [catsL1]);

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
      .select("id,name,parent_id,level,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setAllCategories([]);
      return;
    }

    setAllCategories((data ?? []) as Category[]);
  }

  const loadListings = useCallback(async () => {
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
          min_increment,county,city,delivery_mode,buy_now_price,category_id,is_featured,created_at,
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
        setAllLoadedListings([]);
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
          is_featured: !!l.is_featured,
        })) ?? [];

      if (selectedCategoryIds.length > 0) {
        formatted = formatted.filter(
          (l: Listing) => !!l.category_id && selectedCategoryIds.includes(l.category_id)
        );
      }

      const sellerIds = Array.from(new Set(formatted.map((l) => l.user_id).filter(Boolean))) as string[];

      let sellerPlanMap: Record<string, "free" | "standard" | "pro" | null> = {};
      let sellerRatingMap: Record<
        string,
        { average_rating: number | null; review_count: number | null }
      > = {};

      if (sellerIds.length > 0) {
        const [{ data: sellerPlans }, { data: ratingRows }] = await Promise.all([
          supabase.from("profiles").select("id,subscription_tier").in("id", sellerIds),
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
          is_featured: l.is_featured || tier === "pro",
        };
      });

      formatted.sort((a, b) => {
        if (!!a.is_featured !== !!b.is_featured) return a.is_featured ? -1 : 1;
        if (sort === "ending") return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
        if (sort === "price_desc") return b.current_price - a.current_price;
        if (sort === "price_asc") return a.current_price - b.current_price;
        return 0;
      });

      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;

      setAllLoadedListings(formatted);
      setTotalCount(formatted.length);
      setListings(formatted.slice(start, end));
    } catch (e: any) {
      if (reqId !== listingsReqIdRef.current) return;
      setListings([]);
      setAllLoadedListings([]);
      setTotalCount(0);
      setLoadError(e?.message ?? "Ismeretlen hiba történt a betöltés közben.");
    } finally {
      if (reqId !== listingsReqIdRef.current) return;
      setLoading(false);
    }
  }, [q, county, city, minPrice, maxPrice, sort, selectedCategoryIds, page]);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");

    const pageParam = Number(searchParams.get("page") ?? "1");
    setPage(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);
  }, [searchParams]);

  useEffect(() => {
    loadCategories();
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
    if (!allCategories.length) return;

    const categoryParam = searchParams.get("category");
    if (!categoryParam) return;

    const byId = allCategories.find((c) => c.id === categoryParam);
    if (byId) {
      if (byId.parent_id) {
        const parent = allCategories.find((c) => c.id === byId.parent_id);
        const grandParent = parent?.parent_id
          ? allCategories.find((c) => c.id === parent.parent_id)
          : null;

        if (grandParent) {
          setCatL1(grandParent.id);
          setCatL2(parent?.id ?? "");
          setCatL3(byId.id);
        } else if (parent) {
          setCatL1(parent.id);
          setCatL2(byId.id);
          setCatL3("");
        } else {
          setCatL1(byId.id);
          setCatL2("");
          setCatL3("");
        }
      } else {
        setCatL1(byId.id);
        setCatL2("");
        setCatL3("");
      }
      return;
    }

    const byName = allCategories.find((c) => c.name === categoryParam);
    if (byName) {
      if (byName.parent_id) {
        const parent = allCategories.find((c) => c.id === byName.parent_id);
        const grandParent = parent?.parent_id
          ? allCategories.find((c) => c.id === parent.parent_id)
          : null;

        if (grandParent) {
          setCatL1(grandParent.id);
          setCatL2(parent?.id ?? "");
          setCatL3(byName.id);
        } else if (parent) {
          setCatL1(parent.id);
          setCatL2(byName.id);
          setCatL3("");
        } else {
          setCatL1(byName.id);
          setCatL2("");
          setCatL3("");
        }
      } else {
        setCatL1(byName.id);
        setCatL2("");
        setCatL3("");
      }
    }
  }, [allCategories, searchParams]);

useEffect(() => {
  const t = setTimeout(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = q.trim();

    if (trimmed) params.set("q", trimmed);
    else params.delete("q");

    if (finalCategoryId) params.set("category", finalCategoryId);
    else params.delete("category");

    if (page > 1) params.set("page", String(page));
    else params.delete("page");

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `/listings?${nextQuery}` : "/listings");
    }
  }, 250);

  return () => clearTimeout(t);
}, [q, page, finalCategoryId, router, searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadListings();
    }, 250);

    return () => clearTimeout(t);
  }, [loadListings]);

  const hasAnyFilter =
    !!q.trim() || !!finalCategoryId || !!minPrice || !!maxPrice || !!countyInput || !!cityInput;

  function clearAllFilters() {
    setQ("");
    setCountyInput("");
    setCityInput("");
    setCatL1("");
    setCatL2("");
    setCatL3("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  const filterPanel = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <SlidersHorizontal className="h-4 w-4" />
        Szűrők
      </div>

      <div className="rounded-[2rem] bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Főkategória</label>
              <select
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:bg-white"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Minimum ár</label>
              <Input
                placeholder="0 Ft"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 shadow-none focus-visible:bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Maximum ár</label>
              <Input
                placeholder="Pl. 50 000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 shadow-none focus-visible:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-3 pt-1">
            <Button
              className="h-12 rounded-2xl"
              onClick={() => {
                setPage(1);
                loadListings();
              }}
            >
              Találatok frissítése
            </Button>

            <Button variant="outline" className="h-12 rounded-2xl border-slate-200" onClick={clearAllFilters}>
              Szűrők törlése
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-8 pb-8">
        <section className="relative overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,rgba(219,234,254,0.95),rgba(255,255,255,0.98),rgba(245,208,254,0.78))] px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.6),transparent_35%)]" />

          <div className="relative space-y-6">
            <div className="flex flex-col gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-slate-600 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Élő aukciók
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
                  Találd meg a következő
                  <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                    nyertes licitet
                  </span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Böngéssz szabadon a Licitera aukciói között. Gyors keresés, letisztult szűrés és
                  modern, átlátható piactérélmény.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <form
                    className="relative flex-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPage(1);
                      loadListings();
                    }}
                  >
                    <Input
                      placeholder="Keress termékre, kategóriára vagy kulcsszóra"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="h-14 rounded-[1.75rem] border-slate-200 bg-white pl-12 pr-14 text-base shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                    />
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <button
                      type="submit"
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/15"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    <QuickChip
                      label="Eladás"
                      icon={<PlusSquare className="h-4 w-4" />}
                      onPress={() => router.push("/create-listing")}
                    />
                    <QuickChip
                      label="Kedvencek"
                      icon={<Heart className="h-4 w-4" />}
                      onPress={() => router.push("/watchlist")}
                    />
                    <QuickChip
                      label="Összes kategória"
                      icon={<LayoutGrid className="h-4 w-4" />}
                      onPress={() => setAllCategoriesOpen(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMobileFilters(true)}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm xl:hidden"
                    >
                      <Filter className="h-4 w-4" />
                      Szűrők
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-slate-600 backdrop-blur">
                    Találat:
                    <span className="ml-2 font-black text-slate-900">{totalCount}</span>
                  </div>

                  <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-slate-600 backdrop-blur">
                    Oldal:
                    <span className="ml-2 font-black text-slate-900">
                      {page} / {totalPages}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-slate-600 backdrop-blur">
                    Rendezés:
                    <span className="ml-2 font-black text-slate-900">
                      {sort === "ending"
                        ? "Lejárat szerint"
                        : sort === "new"
                        ? "Legújabb"
                        : sort === "price_desc"
                        ? "Legmagasabb ár"
                        : "Legalacsonyabb ár"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {featuredCategoryCards.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  title="Népszerű kategóriák"
                  actionLabel="Összes kategória"
                  onPress={() => setAllCategoriesOpen(true)}
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {featuredCategoryCards.map((item) => (
                    <CategoryCard
                      key={item.id}
                      label={item.label}
                      emoji={item.emoji}
                      onPress={() => {
                        setCatL1(item.id);
                        setCatL2("");
                        setCatL3("");
                        setPage(1);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="hidden xl:block xl:sticky xl:top-28 xl:self-start">{filterPanel}</aside>

          <section className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Keresés: {q}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {countyInput && (
                  <button
                    onClick={() => setCountyInput("")}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Vármegye: {countyInput}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {cityInput && (
                  <button
                    onClick={() => setCityInput("")}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Település: {cityInput}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {selectedCategoryName && (
                  <button
                    onClick={() => {
                      setCatL1("");
                      setCatL2("");
                      setCatL3("");
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Kategória: {selectedCategoryName}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {minPrice && (
                  <button
                    onClick={() => setMinPrice("")}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Minimum: {minPrice}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {maxPrice && (
                  <button
                    onClick={() => setMaxPrice("")}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Maximum: {maxPrice}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {hasAnyFilter && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Mindent törlök
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 text-sm text-slate-500 sm:inline-flex">
                  <LayoutGrid className="h-4 w-4" />
                  {allLoadedListings.length} aukció
                </div>

                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none shadow-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                >
                  <option value="ending">Hamarosan lejár</option>
                  <option value="new">Legújabb</option>
                  <option value="price_desc">Legmagasabb ár</option>
                  <option value="price_asc">Legalacsonyabb ár</option>
                </select>
              </div>
            </div>

            {loadError ? (
              <div className="rounded-[1.6rem] bg-red-50 px-5 py-5 text-sm text-red-700">
                <div className="font-semibold text-red-900">Hiba történt a betöltésnél</div>
                <div className="mt-2">{loadError}</div>
                <Button variant="outline" className="mt-4" onClick={() => loadListings()}>
                  Újrapróbálom
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[1.9rem] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                  >
                    <Skeleton className="h-56 w-full" />
                    <div className="space-y-4 p-5">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-7 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                      </div>
                      <Skeleton className="h-11 w-full rounded-2xl" />
                    </div>
                  </div>
                ))
              ) : listings.length === 0 ? (
                <div className="col-span-full rounded-[1.9rem] bg-white px-6 py-12 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Search className="h-6 w-6 text-slate-500" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">Nincs találat</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Próbáld meg más kulcsszóval, vagy lazíts a szűrőkön, hogy több releváns aukciót
                    láss.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Button variant="outline" onClick={clearAllFilters}>
                      Szűrők törlése
                    </Button>
                    <Button asChild>
                      <a href="/create-listing">Eladok valamit</a>
                    </Button>
                  </div>
                </div>
              ) : (
                listings.map((l) => {
                  const timeLeft = getTimeLeft(l.ends_at);
                  const endingSoon = new Date(l.ends_at).getTime() - now < 1000 * 60 * 60;
                  const minNext = l.current_price + l.min_increment;
                  const isWatched = mounted ? watchIds.includes(l.id) : false;
                  const categoryName = getCategoryName(l.categories);

                  return (
                    <article
                      key={l.id}
                      className={`group overflow-hidden rounded-[2rem] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)] ${
                        l.is_featured
                          ? "bg-gradient-to-br from-white via-white to-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_18px_45px_rgba(15,23,42,0.08)]"
                          : "bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                      }`}
                    >
                      <div className="relative">
                        <a href={`/listing/${l.id}`} className="block overflow-hidden">
                          {l.image_urls?.[0] ? (
                            <img
                              src={l.image_urls[0]}
                              className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.04] sm:h-64"
                              alt={l.title}
                            />
                          ) : (
                            <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400 sm:h-64">
                              Nincs kép
                            </div>
                          )}
                        </a>

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

                        <div className="absolute left-4 right-[110px] top-4 flex flex-wrap gap-2 pr-2">
                          {l.is_featured && (
                            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-black shadow-sm">
                              KIEMELT
                            </span>
                          )}

                          {categoryName && (
                            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                              {categoryName}
                            </span>
                          )}

                          {endingSoon && (
                            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                              Hamarosan lejár
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const res = toggleWatchlistId(l.id);
                            setWatchIds(res.ids);
                          }}
                          className="absolute right-4 top-4 z-10 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                          title={isWatched ? "Levétel a figyelőlistáról" : "Hozzáadás a figyelőlistához"}
                        >
                          {isWatched ? "✓ Mentve" : "♡ Mentés"}
                        </button>

                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
                            <Clock3 className="h-3.5 w-3.5" />
                            {timeLeft}
                          </div>

                          <a
                            href={`/listing/${l.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                            aria-label="Megnyitás"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>

                      <div className="space-y-5 p-5">
                        <div className="space-y-3">
                          <h2 className="line-clamp-2 text-xl font-bold leading-7 text-slate-900">
                            <a href={`/listing/${l.id}`} className="transition hover:text-primary">
                              {l.title}
                            </a>
                          </h2>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                              <MapPin className="h-3 w-3" />
                              {l.county} · {l.city}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1">
                              {getDeliveryModeLabel(l.delivery_mode)}
                            </span>

                            {l.seller_rating !== null && l.seller_rating !== undefined ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                                <Star className="h-3 w-3 fill-current" />
                                {l.seller_rating.toFixed(1)} ({l.seller_review_count ?? 0})
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Jelenlegi licit
                            </div>
                            <div className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                              {formatHuf(l.current_price)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              Licitek
                            </div>
                            <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                              <Gavel className="h-3.5 w-3.5" />
                              {l.bid_count ?? 0}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[1.35rem] bg-slate-50 p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Következő minimum
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatHuf(minNext)}
                            </div>
                          </div>

                          <div className="rounded-[1.35rem] bg-slate-50 p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Állapot
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {endingSoon ? "Pörgős aukció" : "Aktív aukció"}
                            </div>
                          </div>
                        </div>

                        {l.buy_now_price ? (
                          <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4">
                            <div className="text-xs uppercase tracking-wide text-emerald-700">
                              Villámár
                            </div>
                            <div className="mt-2 font-bold text-emerald-900">
                              {formatHuf(l.buy_now_price)}
                            </div>
                          </div>
                        ) : null}

                        {l.description && (
                          <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                            {l.description}
                          </p>
                        )}

                        <div className="flex gap-3">
                          <Button className="h-11 flex-1 rounded-2xl" asChild>
                            <a href={`/listing/${l.id}`}>Megnyitás</a>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-11 rounded-2xl border-slate-200 px-4"
                            onClick={() => {
                              const res = toggleWatchlistId(l.id);
                              setWatchIds(res.ids);
                            }}
                          >
                            {isWatched ? "Mentve" : "Figyelem"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {!loading && totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:flex-row">
                <div className="text-sm text-slate-600">
                  Oldal <span className="font-semibold text-slate-900">{page}</span> / {totalPages}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Előző
                  </Button>

                  <Button
                    className="rounded-2xl"
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

      {allCategoriesOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/30 p-4 sm:items-center sm:justify-center"
          onClick={() => setAllCategoriesOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h3 className="text-2xl font-black text-slate-900">Összes kategória</h3>

              <button
                type="button"
                onClick={() => setAllCategoriesOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-72px)] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleModalCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setAllCategoriesOpen(false);
                      setCatL1(category.id);
                      setCatL2("");
                      setCatL3("");
                      setPage(1);
                    }}
                    className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                        {category.emoji}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">{category.name}</div>
                        <div className="text-sm text-slate-500">Főkategória</div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showMobileFilters ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/30 p-4 xl:hidden"
          onClick={() => setShowMobileFilters(false)}
        >
          <div
            className="max-h-[88vh] w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h3 className="text-xl font-black text-slate-900">Szűrők</h3>

              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-72px)] overflow-y-auto p-5">{filterPanel}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}