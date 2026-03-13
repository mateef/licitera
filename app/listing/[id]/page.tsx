"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";
import { Clock, Gavel, Heart, ChevronLeft, ImageIcon, MapPin, Truck } from "lucide-react";
import { DELIVERY_MODES } from "@/lib/hungary";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  current_price: number;
  starting_price: number;
  ends_at: string;
  closed_at: string | null;
  final_price: number | null;
  winner_user_id: string | null;
  image_urls: string[] | null;
  user_id: string | null;
  is_active: boolean;
  min_increment: number;
  county: string;
  city: string;
  delivery_mode: string;
  buy_now_price: number | null;
  renewal_count: number;
  categories: { name: string } | null;
};

type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  user_id: string | null;
};

type RelatedListing = {
  id: string;
  title: string;
  current_price: number;
  ends_at: string;
  image_urls: string[] | null;
  min_increment: number;
  county: string;
  city: string;
  delivery_mode: string;
  buy_now_price: number | null;
  categories: { name: string } | null;
};

function getDeliveryModeLabel(value: string) {
  return DELIVERY_MODES.find((x) => x.value === value)?.label ?? value;
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [buyNowSuccess, setBuyNowSuccess] = useState(false);

  const [bidError, setBidError] = useState<string>("");
  const [bidTouched, setBidTouched] = useState(false);

  const [tick, setTick] = useState(0);
  const [autoMinNext, setAutoMinNext] = useState<boolean>(true);

  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [winnerDisplayName, setWinnerDisplayName] = useState("");

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    setNow(Date.now());
  }, [listingId]);

  const [related, setRelated] = useState<RelatedListing[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  function parseBidAmount(raw: string) {
    const cleaned = raw.replace(/\s+/g, "").replace(/,/g, ".");
    const n = Number(cleaned);
    return { cleaned, n };
  }

  async function loadSession() {
    const { data } = await supabase.auth.getSession();
    setSessionUserId(data.session?.user?.id ?? null);
  }

  function toPublicWinnerName(fullName: string | null | undefined) {
  if (!fullName) return "Ismeretlen felhasználó";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ismeretlen felhasználó";
  if (parts.length === 1) return parts[0];

  const firstName = parts[parts.length - 1];
  const lastNameInitial = parts[0].charAt(0).toUpperCase();

  return `${firstName} ${lastNameInitial}.`;
}

  async function loadRelated(categoryName: string | null) {
    if (!categoryName) {
      setRelated([]);
      return;
    }

    setRelatedLoading(true);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,current_price,ends_at,image_urls,min_increment,county,city,delivery_mode,buy_now_price,categories(name)"
      )
      .eq("is_active", true)
      .gt("ends_at", nowIso)
      .neq("id", listingId)
      .eq("categories.name", categoryName)
      .order("ends_at", { ascending: true })
      .limit(6);

    if (error) {
      setRelated([]);
      setRelatedLoading(false);
      return;
    }

    setRelated((data ?? []) as any);
    setRelatedLoading(false);
  }

  async function loadListing() {
    setLoadError("");

    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,description,current_price,starting_price,ends_at,closed_at,final_price,winner_user_id,image_urls,user_id,is_active,min_increment,county,city,delivery_mode,buy_now_price,renewal_count,categories(name)"
      )
      .eq("id", listingId)
      .single();

    if (error) {
      setListing(null);
      setLoadError(error.message || "Nem sikerült betölteni a hirdetést.");
      return;
    }

    setListing(data as any);

const first = (data as any)?.image_urls?.[0] ?? null;
setSelectedImage(first);

await loadWinnerDisplayName((data as any)?.winner_user_id ?? null);
await loadRelated((data as any)?.categories?.name ?? null);
  }

  async function loadWinnerDisplayName(winnerUserId: string | null) {
  if (!winnerUserId) {
    setWinnerDisplayName("");
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, public_display_name")
    .eq("id", winnerUserId)
    .maybeSingle();

  if (error || !data) {
    setWinnerDisplayName("Ismeretlen felhasználó");
    return;
  }

  const publicName =
    (data as any)?.public_display_name ||
    toPublicWinnerName((data as any)?.full_name);

  setWinnerDisplayName(publicName || "Ismeretlen felhasználó");
}

  async function loadBids() {
    const { data, error } = await supabase
      .from("bids")
      .select("id,amount,created_at,user_id")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (!error) setBids((data ?? []) as any);
  }

  const status = useMemo(() => {
    if (!listing) return { expired: false, ended: false };
    const ends = new Date(listing.ends_at).getTime();
    const expired = ends <= now;
    const ended = !listing.is_active || !!listing.closed_at || expired;
    return { expired, ended };
  }, [listing, now]);

  const minNextBid = useMemo(() => {
    if (!listing) return null;
    return listing.current_price + listing.min_increment;
  }, [listing]);

  const isOwner = !!sessionUserId && !!listing?.user_id && sessionUserId === listing.user_id;

  const bidValidation = useMemo(() => {
    if (status.ended) return { ok: false, error: "Az aukció lezárult." };

    if (!sessionUserId) return { ok: false, error: "Licitáláshoz be kell jelentkezni." };
    if (isOwner) return { ok: false, error: "Saját aukcióra nem licitálhatsz." };
    if (!minNextBid) return { ok: false, error: "Nem számolható minimum licit." };

    const trimmed = bidAmount.trim();
    if (!trimmed) return { ok: false, error: "" };

    const { n } = parseBidAmount(trimmed);
    if (!Number.isFinite(n)) return { ok: false, error: "Csak számot adj meg." };
    if (n < minNextBid) return { ok: false, error: `A minimum licit: ${formatHuf(minNextBid)}` };

    return { ok: true, error: "" };
  }, [bidAmount, isOwner, minNextBid, sessionUserId, status.ended]);

  useEffect(() => {
    setBidError(bidValidation.error);
  }, [bidValidation.error]);

  async function buyNow() {
  if (!sessionUserId) {
    toast.error("Be kell jelentkezni.");
    return;
  }

  if (!listing?.buy_now_price) {
    toast.error("Ehhez nincs villámár.");
    return;
  }

  setBuyNowLoading(true);

  try {
    const { error } = await supabase.rpc("buy_now_listing", {
      p_listing_id: listing.id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const notifyRes = await fetch("/api/notifications/buy-now", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId: listing.id }),
    });

    const notifyData = await notifyRes.json().catch(() => null);

    if (!notifyRes.ok) {
      toast.error(notifyData?.error || "A vásárlás sikerült, de az email küldés nem.");
    } else {
      toast.success("Villámáron megvásároltad a terméket ⚡");
    }

    setBuyNowSuccess(true);
    await loadListing();
    await loadBids();
  } finally {
    setBuyNowLoading(false);
  }
}

  async function placeBid() {
    setBidTouched(true);

    if (!bidValidation.ok) {
      if (bidValidation.error) toast.error(bidValidation.error);
      else toast.error("Adj meg összeget.");
      return;
    }

    const { n } = parseBidAmount(bidAmount);
    const amount = n;

    const { data: s } = await supabase.auth.getSession();
const uid = s.session?.user?.id;
if (!uid) return toast.error("Licitáláshoz be kell jelentkezni.");

const { error } = await supabase.rpc("place_bid", {
  p_listing_id: listingId,
  p_amount: amount,
});

if (error) return toast.error(error.message);

await fetch("/api/notifications/new-bid", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    listingId,
    bidderUserId: uid,
    amount,
  }),
});

toast.success("Licit sikeres ✅");
    setBidAmount("");
    setBidTouched(false);
    await loadListing();
    await loadBids();
  }

  async function submitReport() {
    if (!sessionUserId) {
      toast.error("Jelentéshez be kell jelentkezni.");
      return;
    }

    if (!listing) {
      toast.error("A hirdetés nem tölthető be.");
      return;
    }

    if (!reportReason.trim()) {
      toast.error("Válassz jelentési okot.");
      return;
    }

    const { error } = await supabase.from("listing_reports").insert({
      listing_id: listing.id,
      reporter_user_id: sessionUserId,
      reason: reportReason,
      details: reportDetails.trim() || null,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("A jelentést elküldtük.");
    setReportReason("");
    setReportDetails("");
  }

  void tick;

  function timeLeftText(iso: string) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Lejárt";

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days} nap ${hours} óra`;
    return `${hours} óra ${minutes} perc ${seconds} mp`;
  }

  function timeLeftShort(iso: string) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Lejárt";

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days} nap`;
    if (hours > 0) return `${hours} óra ${minutes} perc`;
    return `${minutes} perc`;
  }

  useEffect(() => {
    let mounted = true;

    async function initPage() {
      setPageLoading(true);
      setLoadError("");

      try {
        try {
          const raw = localStorage.getItem("watchlist") || "[]";
          const arr = JSON.parse(raw) as string[];
          if (mounted) setWatched(arr.includes(listingId));
        } catch {
          if (mounted) setWatched(false);
        }

        try {
          const raw = localStorage.getItem("bid_auto_min_next");
          if (raw === null) {
            if (mounted) setAutoMinNext(true);
          } else {
            if (mounted) setAutoMinNext(raw === "1");
          }
        } catch {
          if (mounted) setAutoMinNext(true);
        }

        await loadSession();
        await loadListing();
        await loadBids();
      } catch (e: any) {
        if (mounted) {
          setLoadError(e?.message ?? "Váratlan hiba történt.");
        }
      } finally {
        if (mounted) {
          setPageLoading(false);
        }
      }
    }

    initPage();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });

    const channel = supabase
      .channel(`realtime-listing-${listingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, () => {
        loadListing();
        loadBids();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "listings" }, () => {
        loadListing();
      })
      .subscribe();

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  useEffect(() => {
    if (!autoMinNext) return;
    if (!minNextBid) return;

    const current = parseBidAmount(bidAmount).n;
    const isEmpty = bidAmount.trim() === "";
    const isInvalid = !Number.isFinite(current) || current < minNextBid;

    if (isEmpty || isInvalid) {
      setBidAmount(String(minNextBid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMinNext, minNextBid]);

  useEffect(() => {
    try {
      localStorage.setItem("bid_auto_min_next", autoMinNext ? "1" : "0");
    } catch {}
  }, [autoMinNext]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (pageLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded-2xl bg-muted" />
        <div className="h-[520px] rounded-[2rem] bg-muted" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="rounded-[1.75rem] border-red-200 bg-red-50/70 shadow-none">
        <CardHeader>
          <CardTitle>Nem sikerült betölteni a hirdetést</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-red-700">
          <div>{loadError}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setPageLoading(true);
                await loadListing();
                await loadBids();
                setPageLoading(false);
              }}
            >
              Újrapróbálom
            </Button>

            <Button asChild>
              <a href="/listings">Vissza a listára</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!listing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A hirdetés nem található</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/listings">Vissza a listára</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cover = selectedImage ?? listing.image_urls?.[0] ?? null;
  const renewalCount = listing.renewal_count ?? 0;
  const reachedRenewalLimit = renewalCount >= 2;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {listing.categories?.name && (
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {listing.categories.name}
                </Badge>
              )}
                {buyNowSuccess && (
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
    <div className="font-semibold text-emerald-900">Sikeres villámáras vásárlás ⚡</div>
    <div className="mt-1 text-emerald-800">
      A vásárlás rögzítve lett. A további részleteket emailben is elküldtük az eladónak és a vevőnek.
    </div>
  </div>
)}
              {status.ended ? (
                listing.final_price && listing.buy_now_price && listing.final_price === listing.buy_now_price ? (
                  <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">
                    ⚡ Villámáron elkelt
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="rounded-full px-3 py-1">
                    Lezárva
                  </Badge>
                )
              ) : (
                <Badge className="rounded-full px-3 py-1">Aktív aukció</Badge>
              )}

              {isOwner && (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Saját aukció
                </Badge>
              )}

              {listing.buy_now_price ? (
                <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">
                  Villámár: {formatHuf(listing.buy_now_price)}
                </Badge>
              ) : null}

              <Badge
                variant={reachedRenewalLimit ? "destructive" : "outline"}
                className="rounded-full px-3 py-1"
              >
                Megújítás: {renewalCount} / 2
              </Badge>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {listing.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Lejár: {new Date(listing.ends_at).toLocaleString()}
              </div>
              <div className="font-medium text-slate-900">
                Hátralévő idő: {timeLeftText(listing.ends_at)}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-slate-700">
                <MapPin className="h-4 w-4" />
                {listing.county} · {listing.city}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-slate-700">
                <Truck className="h-4 w-4" />
                {getDeliveryModeLabel(listing.delivery_mode)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <a href="/listings">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Vissza
              </a>
            </Button>

            <Button
              variant={watched ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => {
                const raw = localStorage.getItem("watchlist") || "[]";
                const arr = JSON.parse(raw) as string[];
                const next = watched ? arr.filter((x) => x !== listingId) : [...arr, listingId];
                localStorage.setItem("watchlist", JSON.stringify(next));
                setWatched(!watched);
                window.dispatchEvent(new Event("watchlist-changed"));
                toast.success(watched ? "Levetted a figyelőlistáról" : "Hozzáadva a figyelőlistához");
              }}
              type="button"
            >
              <Heart className="mr-2 h-4 w-4" />
              {watched ? "Figyelőlistán" : "Mentés"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-8">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <CardContent className="p-0">
              {cover ? (
                <div className="flex min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_40%),#f8fafc] p-4 sm:min-h-[420px] sm:p-6">
                  <img
                    src={cover}
                    alt="listing"
                    className="max-h-[560px] w-full rounded-[1.5rem] object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center bg-slate-100 text-slate-400">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  Nincs kép
                </div>
              )}
            </CardContent>
          </Card>

          {!!listing.image_urls?.length && (
            <div className="flex gap-3 overflow-auto pb-1">
              {listing.image_urls.map((url) => (
                <button
                  key={url}
                  onClick={() => setSelectedImage(url)}
                  className={`shrink-0 overflow-hidden rounded-2xl border transition ${
                    selectedImage === url
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  title="Kép kiválasztása"
                  type="button"
                >
                  <img src={url} alt="thumb" className="h-20 w-20 object-cover sm:h-24 sm:w-24" />
                </button>
              ))}
            </div>
          )}

          <Tabs defaultValue="desc">
            <TabsList className="rounded-xl">
              <TabsTrigger value="desc">Leírás</TabsTrigger>
              <TabsTrigger value="bids">Licitnapló</TabsTrigger>
            </TabsList>

            <TabsContent value="desc" className="mt-4">
              <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <CardTitle className="text-lg">Leírás</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {listing.description ? (
                    <p className="whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
                      {listing.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nincs leírás.</p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Helyszín</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {listing.county} · {listing.city}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Átvételi mód</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {getDeliveryModeLabel(listing.delivery_mode)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Megújítások</div>
                    <div className="mt-1 font-semibold text-slate-900">{renewalCount} / 2</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {reachedRenewalLimit
                        ? "A hirdetés elérte a maximális megújítási limitet."
                        : "A licit nélkül lejárt aukciók legfeljebb 2 alkalommal újíthatók meg."}
                    </div>
                  </div>

                  {listing.buy_now_price ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">Villámár</div>
                      <div className="mt-1 text-xl font-bold text-emerald-900">
                        {formatHuf(listing.buy_now_price)}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bids" className="mt-4">
              <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <CardHeader>
                  <CardTitle className="text-lg">Licitnapló</CardTitle>
                </CardHeader>
                <CardContent>
                  {bids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Még nincs licit.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Időpont</TableHead>
                          <TableHead>Összeg</TableHead>
                          <TableHead>Felhasználó</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bids.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(b.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium">{formatHuf(b.amount)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {b.user_id ? b.user_id.slice(0, 8) + "…" : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {(relatedLoading || related.length > 0) && (
            <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <CardHeader>
                <CardTitle className="text-lg">Hasonló aukciók</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {relatedLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden rounded-[1.5rem] border-slate-200/80">
                        <div className="h-36 w-full bg-muted" />
                        <CardHeader className="pb-2">
                          <div className="h-4 w-3/4 rounded bg-muted" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="h-3 w-full rounded bg-muted" />
                          <div className="h-3 w-2/3 rounded bg-muted" />
                          <div className="h-9 w-full rounded bg-muted" />
                        </CardContent>
                      </Card>
                    ))
                  : related.map((r) => {
                      const minNext = r.current_price + r.min_increment;
                      const endingSoon = new Date(r.ends_at).getTime() - Date.now() < 1000 * 60 * 60;

                      return (
                        <Card
                          key={r.id}
                          className="overflow-hidden rounded-[1.5rem] border-slate-200/80 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)]"
                        >
                          {r.image_urls?.[0] ? (
                            <a href={`/listing/${r.id}`} className="block overflow-hidden">
                              <img
                                src={r.image_urls[0]}
                                alt={r.title}
                                className="h-40 w-full object-cover transition duration-300 hover:scale-[1.03]"
                              />
                            </a>
                          ) : (
                            <div className="h-40 w-full bg-muted" />
                          )}

                          <div className="px-5 pt-4 flex flex-wrap items-center gap-2">
                            {r.categories?.name ? (
                              <Badge variant="secondary" className="text-xs">
                                {r.categories.name}
                              </Badge>
                            ) : null}
                            {endingSoon ? (
                              <Badge variant="destructive" className="text-xs">
                                Hamarosan lejár
                              </Badge>
                            ) : null}
                          </div>

                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              <a href={`/listing/${r.id}`} className="line-clamp-2 hover:text-primary">
                                {r.title}
                              </a>
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Jelenlegi licit</span>
                              <span className="font-semibold">{formatHuf(r.current_price)}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Következő minimum</span>
                              <span className="font-medium">{formatHuf(minNext)}</span>
                            </div>

                            <div className="text-xs text-slate-500">
                              {r.county} · {r.city}
                            </div>

                            {r.buy_now_price ? (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <span className="text-xs text-emerald-700">Villámár: </span>
                                <span className="font-semibold text-emerald-900">
                                  {formatHuf(r.buy_now_price)}
                                </span>
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Hátralévő idő
                              </span>
                              <span className="font-medium">{timeLeftShort(r.ends_at)}</span>
                            </div>

                            <Button className="mt-2 w-full rounded-xl" asChild>
                              <a href={`/listing/${r.id}`}>Megnyitás</a>
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="order-1 lg:order-2 lg:col-span-4">
          <div className="space-y-4">
            <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gavel className="h-5 w-5" />
                  Aukció
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Jelenlegi licit</div>
                    <div className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                      {formatHuf(listing.current_price)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Minimum lépcső</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatHuf(listing.min_increment)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Következő minimum</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {minNextBid ? formatHuf(minNextBid) : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Hátralévő idő</div>
                    <div className="mt-1 font-semibold text-slate-900">{timeLeftText(listing.ends_at)}</div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Helyszín</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {listing.county} · {listing.city}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Átvételi mód</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {getDeliveryModeLabel(listing.delivery_mode)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Megújítások</div>
                    <div className="mt-1 font-semibold text-slate-900">{renewalCount} / 2</div>
                  </div>

                  {listing.buy_now_price ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">Villámár</div>
                      <div className="mt-1 text-xl font-bold text-emerald-900">
                        {formatHuf(listing.buy_now_price)}
                      </div>
                    </div>
                  ) : null}
                </div>

                {status.ended ? (
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <div className="font-semibold text-slate-900">
                      {listing.final_price && listing.buy_now_price && listing.final_price === listing.buy_now_price
                        ? "⚡ Villámáron elkelt"
                        : "Lezárva"}
                    </div>
                    <div className="mt-1 text-slate-600">
                      Végső ár: {formatHuf(listing.final_price ?? listing.current_price)}
                    </div>
                    {listing.winner_user_id ? (
  <div className="mt-1 text-slate-600">
    Nyertes: {winnerDisplayName || "Betöltés..."}
  </div>
) : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoMinNext" className="text-sm font-medium">
                          Automatikus minimum
                        </Label>
                        <div className="text-xs text-muted-foreground">
                          Kitölti a következő minimum licitet
                        </div>
                      </div>
                      <Switch
                        id="autoMinNext"
                        checked={autoMinNext}
                        onCheckedChange={(v) => setAutoMinNext(Boolean(v))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder={minNextBid ? `Minimum: ${formatHuf(minNextBid)}` : "Adj meg összeget"}
                        value={bidAmount}
                        onChange={(e) => {
                          setBidAmount(e.target.value);
                          if (!bidTouched) setBidTouched(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            placeBid();
                          }
                        }}
                        onBlur={() => setBidTouched(true)}
                        inputMode="decimal"
                        aria-invalid={bidTouched && !!bidError}
                        className="h-12 rounded-xl"
                      />

                      {bidTouched && bidError ? (
                        <div className="text-xs text-destructive">{bidError}</div>
                      ) : null}

                      <div className="text-xs text-muted-foreground">
                        Minimum licit:{" "}
                        <span className="font-medium text-foreground">
                          {minNextBid ? formatHuf(minNextBid) : "-"}
                        </span>
                        {autoMinNext ? <span> · Auto kitöltés bekapcsolva</span> : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setBidAmount(String(minNextBid ?? ""))}
                        disabled={!minNextBid}
                      >
                        Minimum
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setBidAmount(String((minNextBid ?? 0) + listing.min_increment * 5))}
                        disabled={!minNextBid}
                      >
                        +5 lépcső
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setBidAmount(String((minNextBid ?? 0) + listing.min_increment * 10))}
                        disabled={!minNextBid}
                      >
                        +10 lépcső
                      </Button>
                    </div>

                    <Button className="h-12 w-full rounded-xl" onClick={placeBid} disabled={!bidValidation.ok}>
                      Licitálok
                    </Button>

                    {listing.buy_now_price && !status.ended && !isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                            ⚡ Megveszem villámáron ({formatHuf(listing.buy_now_price)})
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Villámáras vásárlás</AlertDialogTitle>
                            <AlertDialogDescription>
                              Biztosan szeretnéd megvásárolni ezt a terméket?
                              <br />
                              <br />
                              <strong>Végösszeg: {formatHuf(listing.buy_now_price)}</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Nem</AlertDialogCancel>
                            <AlertDialogAction onClick={buyNow} disabled={buyNowLoading}>
  {buyNowLoading ? "Folyamatban..." : "Igen, megveszem"}
</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {!sessionUserId ? (
                      <p className="text-xs text-muted-foreground">
                        Licitáláshoz be kell jelentkezni:{" "}
                        <a className="underline" href="/login">
                          /login
                        </a>
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button variant="outline" className="min-w-0 rounded-xl" asChild>
                    <a className="truncate" href="/listings">
                      Vissza
                    </a>
                  </Button>

                  <Button
                    className="min-w-0 rounded-xl"
                    variant={watched ? "default" : "outline"}
                    onClick={() => {
                      const raw = localStorage.getItem("watchlist") || "[]";
                      const arr = JSON.parse(raw) as string[];
                      const next = watched ? arr.filter((x) => x !== listingId) : [...arr, listingId];
                      localStorage.setItem("watchlist", JSON.stringify(next));
                      setWatched(!watched);
                      window.dispatchEvent(new Event("watchlist-changed"));
                      toast.success(watched ? "Levetted a figyelőlistáról" : "Hozzáadva a figyelőlistához");
                    }}
                    type="button"
                  >
                    <span className="truncate">
                      {watched ? "✓ Figyelőlistán" : "♡ Mentés"}
                    </span>
                  </Button>

                  <Button variant="secondary" className="min-w-0 rounded-xl" asChild>
                    <a className="truncate" href="/my-listings">
                      Saját
                    </a>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="min-w-0 rounded-xl">
                        Jelentés
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hirdetés jelentése</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ha szerinted a hirdetés szabályt sért vagy problémás, küldj jelentést az adminnak.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <div className="space-y-3">
                        <select
                          className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                        >
                          <option value="">Válassz okot</option>
                          <option value="hamis_termek">Hamis / félrevezető termék</option>
                          <option value="tiltott_termek">Tiltott termék</option>
                          <option value="spam">Spam / duplikált hirdetés</option>
                          <option value="serto_tartalom">Sértő / nem odaillő tartalom</option>
                          <option value="egyeb">Egyéb</option>
                        </select>

                        <textarea
                          className="min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"
                          placeholder="Írd le röviden, mi a probléma..."
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                        />
                      </div>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={submitReport}>
                          Jelentés elküldése
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}