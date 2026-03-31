"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react";
import { formatHuf } from "@/lib/format";

type ProfileRow = {
  id: string;
  full_name: string | null;
  public_display_name: string | null;
  phone_verified: boolean | null;
  is_banned?: boolean | null;
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

function resolveDisplayName(
  profileLike: { public_display_name?: string | null; full_name?: string | null } | null | undefined
) {
  if (!profileLike) return "Ismeretlen felhasználó";
  return profileLike.public_display_name || toPublicName(profileLike.full_name);
}

function timeLeftShort(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "Lejárt";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  async function loadProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,public_display_name,phone_verified,is_banned")
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

    if (error) {
      setReviews([]);
      setReviewerNames({});
      return;
    }

    const rows = (data ?? []) as ReviewRow[];
    setReviews(rows);

    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_user_id).filter(Boolean)));

    if (reviewerIds.length === 0) {
      setReviewerNames({});
      return;
    }

    const { data: profs } = await supabase
      .from("profiles")
      .select("id,full_name,public_display_name")
      .in("id", reviewerIds);

    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => {
      map[p.id] = p.public_display_name || toPublicName(p.full_name);
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

    await Promise.all([loadProfile(), loadRatingSummary(), loadReviews(), loadListings()]);

    setLoading(false);
  }

  useEffect(() => {
    if (!profileId) return;
    init();
  }, [profileId]);

  const publicName = useMemo(() => resolveDisplayName(profile), [profile]);

  const avgRatingText =
    ratingSummary?.average_rating !== null && ratingSummary?.average_rating !== undefined
      ? ratingSummary.average_rating.toFixed(1).replace(".", ",")
      : "Még nincs";

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-14 rounded-[1.75rem] bg-muted" />
        <div className="h-64 rounded-[2rem] bg-muted" />
        <div className="h-80 rounded-[2rem] bg-muted" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="rounded-[2rem]">
        <CardContent className="p-6">
          <div className="text-xl font-bold text-slate-900">Nem sikerült betölteni a profilt</div>
          <div className="mt-2 text-sm text-slate-600">{loadError}</div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="rounded-[2rem]">
        <CardContent className="p-6">
          <div className="text-xl font-bold text-slate-900">A profil nem található</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.88),rgba(255,255,255,0.97),rgba(245,208,254,0.72))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {publicName}
              </Badge>

              {profile.phone_verified ? (
                <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                  Telefonszám hitelesítve
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Telefonszám nincs hitelesítve
                </Badge>
              )}

              {profile.is_banned ? (
                <Badge className="rounded-full bg-red-600 px-3 py-1 text-white hover:bg-red-600">
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                  Tiltott felhasználó
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {publicName} profilja
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Aktív aukciók, lezárt hirdetések és nyilvános értékelések egy helyen.
            </p>
          </div>

          <div className="grid min-w-[240px] grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Értékelés</div>
              <div className="mt-2 inline-flex items-center gap-2 text-2xl font-black text-slate-900">
                <Star className="h-5 w-5 fill-current text-amber-500" />
                {avgRatingText}
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Értékelések</div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {ratingSummary?.review_count ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="rounded-[1.75rem] border-slate-200/80">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5">
                <div className="text-xl font-bold text-slate-900">Aktív aukciók</div>
                <div className="mt-1 text-sm text-slate-500">
                  Jelenleg futó hirdetések ettől a felhasználótól.
                </div>
              </div>

              {activeListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Jelenleg nincs aktív aukciója.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeListings.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
                    >
                      <Link href={`/listing/${item.id}`} className="block overflow-hidden">
                        {item.image_urls?.[0] ? (
                          <img
                            src={item.image_urls[0]}
                            alt={item.title}
                            className="h-44 w-full object-cover transition duration-500 hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-400">
                            Nincs kép
                          </div>
                        )}
                      </Link>

                      <div className="space-y-4 p-4">
                        <div>
                          <Link
                            href={`/listing/${item.id}`}
                            className="line-clamp-2 text-base font-bold text-slate-900 hover:text-primary"
                          >
                            {item.title}
                          </Link>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Jelenlegi licit</span>
                          <span className="font-semibold text-slate-900">
                            {formatHuf(item.current_price)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock3 className="h-4 w-4" />
                            Hátralévő idő
                          </span>
                          <span className="font-medium text-slate-900">
                            {timeLeftShort(item.ends_at, now)}
                          </span>
                        </div>

                        <Button asChild className="w-full rounded-xl">
                          <Link href={`/listing/${item.id}`}>Megnyitás</Link>
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200/80">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5">
                <div className="text-xl font-bold text-slate-900">Kapott értékelések</div>
                <div className="mt-1 text-sm text-slate-500">
                  Ezeket az értékeléseket kapta sikeres adás-vételek után.
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Még nincs nyilvános értékelés.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-900">
                          {reviewerNames[row.reviewer_user_id] || "Ismeretlen felhasználó"}
                        </div>

                        <Badge className="inline-flex items-center gap-1 rounded-full">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {row.rating}/5
                        </Badge>
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        Hirdetés: {row.listings?.[0]?.title ?? "Ismeretlen hirdetés"}
                      </div>

                      {row.comment ? (
                        <div className="mt-3 text-sm leading-6 text-slate-700">{row.comment}</div>
                      ) : null}

                      <div className="mt-3 text-xs text-slate-400">
                        {new Date(row.created_at).toLocaleString("hu-HU")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card className="rounded-[1.75rem] border-slate-200/80">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-1 sm:p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Aktív aukciók</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{activeListings.length}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Lezárt hirdetések</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{endedListings.length}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Átlagos értékelés</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{avgRatingText}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Hitelesítés</div>
                <div className="mt-2 font-semibold text-slate-900">
                  {profile.phone_verified ? "Telefonszám hitelesítve" : "Nincs hitelesített telefonszám"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200/80">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5 text-xl font-bold text-slate-900">Legutóbbi lezárt hirdetések</div>

              {endedListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Még nincs lezárt hirdetés.
                </div>
              ) : (
                <div className="space-y-4">
                  {endedListings.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        {item.image_urls?.[0] ? (
                          <img
                            src={item.image_urls[0]}
                            alt={item.title}
                            className="h-20 w-20 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-xl bg-slate-100" />
                        )}

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/listing/${item.id}`}
                            className="line-clamp-2 font-semibold text-slate-900 hover:text-primary"
                          >
                            {item.title}
                          </Link>

                          <div className="mt-2 text-sm text-slate-500">
                            Lezárva:{" "}
                            {item.closed_at
                              ? new Date(item.closed_at).toLocaleString("hu-HU")
                              : new Date(item.ends_at).toLocaleString("hu-HU")}
                          </div>

                          <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Végső ár: {formatHuf(item.final_price ?? item.current_price)}
                          </div>

                          <div className="mt-3">
                            <Link
                              href={`/listing/${item.id}`}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-80"
                            >
                              Megnyitás
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}