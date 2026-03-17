"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Gavel, Clock, CheckCircle2 } from "lucide-react";
import { formatHuf } from "@/lib/format";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone_verified: boolean | null;
};

type RatingSummaryRow = {
  user_id: string;
  average_rating: number | null;
  review_count: number | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  listing_id: string;
  reviewer_user_id: string;
  reviewed_user_id: string;
  listings?: { title: string | null }[] | null;
};

type ListingRow = {
  id: string;
  title: string;
  current_price: number;
  final_price: number | null;
  ends_at: string;
  closed_at: string | null;
  is_active: boolean;
  image_urls: string[] | null;
};

function toPublicName(fullName: string | null | undefined) {
  if (!fullName) return "Ismeretlen felhasználó";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ismeretlen felhasználó";
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
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

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummaryRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [activeListings, setActiveListings] = useState<ListingRow[]>([]);
  const [endedListings, setEndedListings] = useState<ListingRow[]>([]);
  const [loadError, setLoadError] = useState("");

  async function loadProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone_verified")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      return;
    }

    setProfile((data ?? null) as ProfileRow | null);
  }

  async function loadRatingSummary() {
    const { data } = await supabase
      .from("user_rating_summary")
      .select("user_id,average_rating,review_count")
      .eq("user_id", profileId)
      .maybeSingle();

    setRatingSummary((data ?? null) as RatingSummaryRow | null);
  }

  async function loadReviews() {
    const { data, error } = await supabase
      .from("listing_reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        listing_id,
        reviewer_user_id,
        reviewed_user_id,
        listings(title)
      `)
      .eq("reviewed_user_id", profileId)
      .order("created_at", { ascending: false });

    if (error) return;

    const rows = (data ?? []) as ReviewRow[];
    setReviews(rows);

    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_user_id).filter(Boolean)));

    if (reviewerIds.length === 0) {
      setReviewerNames({});
      return;
    }

    const { data: profs } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", reviewerIds);

    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => {
      map[p.id] = toPublicName(p.full_name);
    });
    setReviewerNames(map);
  }

  async function loadListings() {
    const nowIso = new Date().toISOString();

    const { data: activeData } = await supabase
      .from("listings")
      .select("id,title,current_price,final_price,ends_at,closed_at,is_active,image_urls")
      .eq("user_id", profileId)
      .eq("is_active", true)
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: true })
      .limit(12);

    const { data: endedData } = await supabase
      .from("listings")
      .select("id,title,current_price,final_price,ends_at,closed_at,is_active,image_urls")
      .eq("user_id", profileId)
      .or(`is_active.eq.false,closed_at.not.is.null,ends_at.lte.${nowIso}`)
      .order("ends_at", { ascending: false })
      .limit(12);

    setActiveListings((activeData ?? []) as ListingRow[]);
    setEndedListings((endedData ?? []) as ListingRow[]);
  }

  async function init() {
    setLoading(true);
    setLoadError("");

    await Promise.all([
      loadProfile(),
      loadRatingSummary(),
      loadReviews(),
      loadListings(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    init();
  }, [profileId]);

  const publicName = useMemo(() => toPublicName(profile?.full_name), [profile?.full_name]);
  const avgRatingText =
    ratingSummary?.average_rating !== null && ratingSummary?.average_rating !== undefined
      ? ratingSummary.average_rating.toFixed(1).replace(".", ",")
      : "Még nincs";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-52 rounded bg-muted" />
        <div className="h-40 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nem sikerült betölteni a profilt</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A profil nem található</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{publicName}</Badge>
              {profile.phone_verified ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  Telefonszám hitelesítve
                </Badge>
              ) : (
                <Badge variant="outline">Telefonszám nincs hitelesítve</Badge>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {publicName} profilja
            </h1>

            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Aktív aukciók, lezárt hirdetések és felhasználói értékelések.
            </p>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Értékelés</div>
              <div className="mt-1 inline-flex items-center gap-1 text-2xl font-black text-slate-900">
                <Star className="h-5 w-5 fill-current" />
                {avgRatingText}
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Értékelések</div>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {ratingSummary?.review_count ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Aktív aukciók</CardTitle>
              <CardDescription>
                Jelenleg futó hirdetések ettől a felhasználótól.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeListings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Jelenleg nincs aktív aukciója.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeListings.map((item) => (
                    <Card key={item.id} className="overflow-hidden rounded-[1.5rem]">
                      {item.image_urls?.[0] ? (
                        <a href={`/listing/${item.id}`}>
                          <img
                            src={item.image_urls[0]}
                            alt={item.title}
                            className="h-40 w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="h-40 w-full bg-muted" />
                      )}

                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          <a href={`/listing/${item.id}`} className="line-clamp-2 hover:underline">
                            {item.title}
                          </a>
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Jelenlegi licit</span>
                          <span className="font-semibold">{formatHuf(item.current_price)}</span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Hátralévő idő
                          </span>
                          <span className="font-medium text-foreground">
                            {timeLeftShort(item.ends_at)}
                          </span>
                        </div>

                        <Button asChild className="mt-2 w-full rounded-xl">
                          <a href={`/listing/${item.id}`}>Megnyitás</a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Kapott értékelések</CardTitle>
              <CardDescription>
                Ezeket az értékeléseket kapta sikeres adás-vételek után.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Még nincs nyilvános értékelés.</p>
              ) : (
                reviews.map((row) => (
                  <div key={row.id} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        {reviewerNames[row.reviewer_user_id] || "Ismeretlen felhasználó"}
                      </div>
                      <Badge className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {row.rating}/5
                      </Badge>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      Hirdetés: {row.listings?.[0]?.title ?? "Ismeretlen hirdetés"}
                    </div>

                    {row.comment ? <div className="mt-2 text-sm">{row.comment}</div> : null}

                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Profil statisztika</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Aktív aukciók</div>
                <div className="mt-1 text-2xl font-black text-slate-900">
                  {activeListings.length}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Lezárt hirdetések</div>
                <div className="mt-1 text-2xl font-black text-slate-900">
                  {endedListings.length}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Átlagos értékelés</div>
                <div className="mt-1 text-2xl font-black text-slate-900">
                  {avgRatingText}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Hitelesítés</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {profile.phone_verified ? "Telefonszám hitelesítve" : "Nincs hitelesített telefonszám"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Legutóbbi lezárt hirdetések</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {endedListings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Még nincs lezárt hirdetés.</p>
              ) : (
                endedListings.map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4">
                    <div className="flex items-start gap-3">
                      {item.image_urls?.[0] ? (
                        <img
                          src={item.image_urls[0]}
                          alt={item.title}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-muted" />
                      )}

                      <div className="min-w-0 flex-1">
                        <a
                          href={`/listing/${item.id}`}
                          className="line-clamp-2 font-semibold hover:underline"
                        >
                          {item.title}
                        </a>

                        <div className="mt-2 text-sm text-muted-foreground">
                          Lezárva: {item.closed_at ? new Date(item.closed_at).toLocaleString() : new Date(item.ends_at).toLocaleString()}
                        </div>

                        <div className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                          <CheckCircle2 className="h-4 w-4" />
                          Végső ár: {formatHuf(item.final_price ?? item.current_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}