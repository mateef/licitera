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
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";
import { Clock, Gavel, Heart, ChevronLeft, ImageIcon } from "lucide-react";

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
  categories: { name: string } | null;
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);

  const [bidError, setBidError] = useState<string>("");
  const [bidTouched, setBidTouched] = useState(false);

  const [tick, setTick] = useState(0);
  const [autoMinNext, setAutoMinNext] = useState<boolean>(true);

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

  async function loadRelated(categoryName: string | null) {
    if (!categoryName) {
      setRelated([]);
      return;
    }

    setRelatedLoading(true);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("listings")
      .select("id,title,current_price,ends_at,image_urls,min_increment,categories(name)")
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
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,description,current_price,starting_price,ends_at,closed_at,final_price,winner_user_id,image_urls,user_id,is_active,min_increment,categories(name)"
      )
      .eq("id", listingId)
      .single();

    if (error) return toast.error(error.message);

    setListing(data as any);

    const first = (data as any)?.image_urls?.[0] ?? null;
    setSelectedImage((prev) => prev ?? first);

    await loadRelated((data as any)?.categories?.name ?? null);
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

    toast.success("Licit sikeres ✅");
    setBidAmount("");
    setBidTouched(false);
    await loadListing();
    await loadBids();
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
    try {
      const raw = localStorage.getItem("watchlist") || "[]";
      const arr = JSON.parse(raw) as string[];
      setWatched(arr.includes(listingId));
    } catch {
      setWatched(false);
    }

    try {
      const raw = localStorage.getItem("bid_auto_min_next");
      if (raw === null) {
        setAutoMinNext(true);
      } else {
        setAutoMinNext(raw === "1");
      }
    } catch {
      setAutoMinNext(true);
    }

    loadSession();
    loadListing();
    loadBids();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => loadSession());

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

  if (!listing) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 rounded-2xl bg-muted" />
        <div className="h-[520px] rounded-[2rem] bg-muted" />
      </div>
    );
  }

  const cover = selectedImage ?? listing.image_urls?.[0] ?? null;

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
              {status.ended ? (
                <Badge variant="destructive" className="rounded-full px-3 py-1">
                  Lezárva
                </Badge>
              ) : (
                <Badge className="rounded-full px-3 py-1">Aktív aukció</Badge>
              )}
              {isOwner && (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Saját aukció
                </Badge>
              )}
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
        <div className="space-y-6 lg:col-span-8">
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
                <CardContent>
                  {listing.description ? (
                    <p className="whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
                      {listing.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nincs leírás.</p>
                  )}
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

                          <div className="px-5 pt-4 flex items-center gap-2">
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

                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Jelenlegi licit</span>
                              <span className="font-semibold">{formatHuf(r.current_price)}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Következő minimum</span>
                              <span className="font-medium">{formatHuf(minNext)}</span>
                            </div>

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

        <div className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-24">
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
                </div>

                {status.ended ? (
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <div className="font-semibold text-slate-900">Lezárva</div>
                    <div className="mt-1 text-slate-600">
                      Végső ár: {formatHuf(listing.final_price ?? listing.current_price)}
                    </div>
                    {listing.winner_user_id ? (
                      <div className="mt-1 text-slate-600">
                        Nyertes: {listing.winner_user_id.slice(0, 8)}…
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
                <div className="grid grid-cols-[1fr,1.35fr,1fr] gap-2">
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}