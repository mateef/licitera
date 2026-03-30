"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { MessageCircle } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  current_price: number;
  ends_at: string;
  created_at: string;
  image_urls: string[] | null;
  image_paths: string[] | null;
  bid_count?: number;
  renewal_count: number;
  final_price: number | null;
  buy_now_price: number | null;
  winner_user_id: string | null;
  is_active: boolean;
  closed_at: string | null;
};

type WinnerProfileRow = {
  id: string;
  full_name: string | null;
  public_display_name?: string | null;
};

export default function MyListingsPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteReasons, setDeleteReasons] = useState<Record<string, string>>({});
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);

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

  function toPublicWinnerName(fullName: string | null | undefined) {
    if (!fullName) return "Ismeretlen felhasználó";

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Ismeretlen felhasználó";
    if (parts.length === 1) return parts[0];

    const firstName = parts[parts.length - 1];
    const lastNameInitial = parts[0].charAt(0).toUpperCase();

    return `${firstName} ${lastNameInitial}.`;
  }

  function getIsActiveListing(listing: Listing, currentNow: number) {
    const ends = new Date(listing.ends_at).getTime();
    return listing.is_active && !listing.closed_at && ends > currentNow;
  }

  function canDeleteDirectly(listing: Listing) {
    const createdAt = new Date(listing.created_at).getTime();
    const oneHourLater = createdAt + 60 * 60 * 1000;
    const stillWithinOneHour = Date.now() <= oneHourLater;
    const hasNoBids = (listing.bid_count ?? 0) === 0;
    const isStillActive = new Date(listing.ends_at).getTime() > Date.now();

    return stillWithinOneHour && hasNoBids && isStillActive;
  }

  function canRenewListing(listing: Listing) {
    const isExpired = new Date(listing.ends_at).getTime() <= Date.now();
    const hasNoBids = (listing.bid_count ?? 0) === 0;
    const canStillRenew = (listing.renewal_count ?? 0) < 2;

    return isExpired && hasNoBids && canStillRenew;
  }

  async function loadWinnerNames(rows: Listing[]) {
    const winnerIds = Array.from(
      new Set(rows.map((x) => x.winner_user_id).filter(Boolean) as string[])
    );

    if (winnerIds.length === 0) {
      setWinnerNames({});
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,public_display_name")
      .in("id", winnerIds);

    if (error || !data) {
      setWinnerNames({});
      return;
    }

    const map: Record<string, string> = {};
    (data as WinnerProfileRow[]).forEach((profile) => {
      map[profile.id] =
        profile.public_display_name ||
        toPublicWinnerName(profile.full_name) ||
        "Ismeretlen felhasználó";
    });

    setWinnerNames(map);
  }

  async function init() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id ?? null;

    if (!userId) {
      router.replace("/login?next=/my-listings");
      return;
    }

    setUid(userId);
    await loadMyListings(userId);
  }

  async function loadMyListings(userId: string) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,current_price,ends_at,created_at,image_urls,image_paths,renewal_count,final_price,buy_now_price,winner_user_id,is_active,closed_at,bids(count)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setListings([]);
      setLoading(false);
      return;
    }

    const formatted: Listing[] =
      data?.map((item: any) => ({
        ...item,
        bid_count: item.bids?.[0]?.count ?? 0,
        renewal_count: item.renewal_count ?? 0,
        final_price: item.final_price ?? null,
        buy_now_price: item.buy_now_price ?? null,
        winner_user_id: item.winner_user_id ?? null,
      })) ?? [];

    const sorted = [...formatted].sort((a, b) => {
      const aActive = getIsActiveListing(a, Date.now());
      const bActive = getIsActiveListing(b, Date.now());

      if (aActive !== bActive) return aActive ? -1 : 1;

      if (aActive && bActive) {
        return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setListings(sorted);
    await loadWinnerNames(sorted);
    setLoading(false);
  }

  async function deleteListing(listingId: string) {
    if (!uid) return;

    try {
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

      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("listing-images").remove(paths);
        if (rmErr) {
          toast.error(`Képek törlése sikertelen: ${rmErr.message}`);
          return;
        }
      }

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

  async function createDeleteRequest(listingId: string, reason: string) {
    if (!uid) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      toast.error("Írd le, miért szeretnéd törölni az aukciót.");
      return;
    }

    const { error } = await supabase.from("listing_delete_requests").insert({
      listing_id: listingId,
      user_id: uid,
      reason: trimmedReason,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Törlési kérelmed elküldve.");
  }

  async function renewListing(listingId: string) {
    if (!uid) return;

    const { error } = await supabase.rpc("renew_listing", {
      p_listing_id: listingId,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Aukció sikeresen megújítva.");
    await loadMyListings(uid);
  }

  async function openChatForListing(listing: Listing) {
    if (!uid || !listing.winner_user_id) return;

    setOpeningChatFor(listing.id);

    try {
      const res = await fetch("/api/chat/get-or-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: listing.id,
          sellerId: uid,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült megnyitni a chatet.");
        return;
      }

      window.location.href = `/chat/${data.threadId}`;
    } catch {
      toast.error("Chat hiba.");
    } finally {
      setOpeningChatFor(null);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => {
    return listings.filter((l) => getIsActiveListing(l, now)).length;
  }, [listings, now]);

  const endedCount = useMemo(() => listings.length - activeCount, [listings.length, activeCount]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Saját aukciók
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Itt látod az általad létrehozott aukciókat. Az aktív aukciók mindig előre kerülnek.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" asChild>
              <a href="/listings">Vissza a listához</a>
            </Button>

            <Button variant="outline" className="rounded-full" asChild>
              <a href="/chat">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat
              </a>
            </Button>

            <Button className="rounded-full" asChild>
              <a href="/create-listing">Új aukció</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Összesen: {listings.length}</Badge>
        <Badge>Aktív: {activeCount}</Badge>
        <Badge variant="outline">Lejárt: {endedCount}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden rounded-[1.75rem]">
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
          <Card className="sm:col-span-2 rounded-[1.75rem]">
            <CardHeader>
              <CardTitle className="text-base">Még nincs aukciód</CardTitle>
              <CardDescription>Indíts egyet, és meg fog jelenni itt.</CardDescription>
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
            const isActive = getIsActiveListing(l, now);
            const cover = l.image_urls?.[0] ?? null;
            const directDeleteAllowed = canDeleteDirectly(l);
            const renewAllowed = canRenewListing(l);

            const winnerName = l.winner_user_id
              ? winnerNames[l.winner_user_id] || "Betöltés..."
              : "";

            const wonByBuyNow =
              !!l.final_price &&
              !!l.buy_now_price &&
              l.final_price === l.buy_now_price;

            const winningAmount = l.final_price ?? l.current_price;

            return (
              <Card
                key={l.id}
                className="overflow-hidden rounded-[1.75rem] border-slate-200/80 transition hover:shadow-md"
              >
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
                    {!isActive && wonByBuyNow ? (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                        ⚡ Villámáron elkelt
                      </Badge>
                    ) : null}
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
                    <span className="text-muted-foreground">
                      {isActive ? "Jelenlegi licit" : "Záró ár"}
                    </span>
                    <span className="font-semibold">
                      {formatHuf(isActive ? l.current_price : l.final_price ?? l.current_price)}
                    </span>
                  </div>

                  {!isActive && l.winner_user_id ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">
                        {wonByBuyNow ? "Villámáras vásárlás" : "Győztes licit"}
                      </div>
                      <div className="mt-1 font-semibold text-emerald-900">{winnerName}</div>
                      <div className="mt-1 text-sm text-emerald-800">
                        {wonByBuyNow ? "Villámáron megvette" : "Ennyivel nyert"}:{" "}
                        <span className="font-semibold">{formatHuf(winningAmount)}</span>
                      </div>
                    </div>
                  ) : !isActive && (l.bid_count ?? 0) === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Az aukció licit nélkül járt le.
                    </div>
                  ) : null}

                  <div className="text-xs text-muted-foreground">
                    {(l.bid_count ?? 0) === 0 ? "Még nincs licit." : `${l.bid_count} licit érkezett.`}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {directDeleteAllowed
                      ? "Közvetlenül törölhető: 1 órán belül, licit nélkül."
                      : "Közvetlen törlés nem elérhető, csak admin kérelmen keresztül."}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Megújítások: {l.renewal_count ?? 0} / 2
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button variant="outline" asChild>
                      <a href={`/listing/${l.id}`}>Megnyitás</a>
                    </Button>

                    {l.winner_user_id ? (
                      <Button
                        variant="outline"
                        onClick={() => openChatForListing(l)}
                        disabled={openingChatFor === l.id}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {openingChatFor === l.id ? "Megnyitás..." : "Chat"}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        Chat
                      </Button>
                    )}

                    {renewAllowed ? (
                      <Button variant="secondary" onClick={() => renewListing(l.id)}>
                        Megújítás
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled>
                        Megújítás
                      </Button>
                    )}

                    {directDeleteAllowed ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Törlés</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Az aukció és a feltöltött képek is törlődnek. Ez a művelet nem
                              visszavonható. Közvetlen törlés csak a létrehozást követő 1 órán belül
                              és licit nélkül engedélyezett.
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
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="secondary">Törlési kérelem</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Törlési kérelem küldése</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ez az aukció már nem törölhető közvetlenül. Írd le röviden, miért
                              szeretnéd törölni, és az admin elbírálja a kérelmet.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <textarea
                            className="min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"
                            placeholder="Pl. rossz terméket töltöttem fel, hibás adatok szerepelnek, a termék megsérült..."
                            value={deleteReasons[l.id] ?? ""}
                            onChange={(e) =>
                              setDeleteReasons((prev) => ({
                                ...prev,
                                [l.id]: e.target.value,
                              }))
                            }
                          />

                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => createDeleteRequest(l.id, deleteReasons[l.id] ?? "")}
                            >
                              Kérelem küldése
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}