"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  public_display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
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

function toPublicName(fullName: string | null | undefined) {
  if (!fullName) return "Ismeretlen felhasználó";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ismeretlen felhasználó";
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [averageRating, setAverageRating] = useState<string>("Még nincs");
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});

  async function init() {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,full_name,public_display_name,bio,profile_image_url")
      .eq("id", profileId)
      .maybeSingle();

    setProfile(profileData as ProfileRow | null);

    const { data: summaryData } = await supabase
      .from("user_rating_summary")
      .select("user_id,average_rating,review_count")
      .eq("user_id", profileId)
      .maybeSingle();

    if (summaryData && (summaryData as any).average_rating !== null) {
      setAverageRating(Number((summaryData as any).average_rating).toFixed(1).replace(".", ","));
      setReviewCount((summaryData as any).review_count ?? 0);
    } else {
      setAverageRating("Még nincs");
      setReviewCount(0);
    }

    const { data: reviewData } = await supabase
      .from("listing_reviews")
      .select(`
        id,rating,comment,created_at,reviewer_user_id,
        listings(title)
      `)
      .eq("reviewed_user_id", profileId)
      .order("created_at", { ascending: false });

    const rows = (reviewData ?? []) as ReviewRow[];
    setReviews(rows);

    const reviewerIds = rows.map((r) => r.reviewer_user_id);
    if (reviewerIds.length > 0) {
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

    setLoading(false);
  }

  useEffect(() => {
    init();
  }, [profileId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Betöltés...</div>;
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil nem található</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const publicName = profile.public_display_name || toPublicName(profile.full_name);

  return (
    <div className="space-y-6">
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>{publicName}</CardTitle>
          <CardDescription>Nyilvános felhasználói profil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={publicName}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : null}

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium">
            <Star className="h-4 w-4 fill-current" />
            {averageRating}
            <span className="text-muted-foreground">· {reviewCount} értékelés</span>
          </div>

          {profile.bio ? <div className="text-sm leading-6">{profile.bio}</div> : null}
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Értékelések</CardTitle>
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
                  <Badge>{row.rating}/5</Badge>
                </div>

                <div className="mt-2 text-sm text-muted-foreground">
                  Hirdetés: {row.listings?.[0]?.title ?? "Ismeretlen hirdetés"}
                </div>

                {row.comment ? <div className="mt-2 text-sm">{row.comment}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}