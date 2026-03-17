"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, UserRound, Phone } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  profile_image_url: string | null;
};

type ReviewCandidate = {
  id: string;
  title: string;
  user_id: string | null;
  winner_user_id: string | null;
  closed_at: string | null;
  final_price: number | null;
  image_urls?: string[] | null;
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

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sendingSms, setSendingSms] = useState(false);
  const [verifyingSms, setVerifyingSms] = useState(false);

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [smsCode, setSmsCode] = useState("");

  const [msg, setMsg] = useState("");

  const [pendingReviews, setPendingReviews] = useState<ReviewCandidate[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewRow[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ReviewRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [otherPartyNames, setOtherPartyNames] = useState<Record<string, string>>({});

  const [reviewRatings, setReviewRatings] = useState<Record<string, string>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

  function toPublicName(fullNameValue: string | null | undefined) {
    if (!fullNameValue) return "Ismeretlen felhasználó";
    const parts = fullNameValue.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Ismeretlen felhasználó";
    if (parts.length === 1) return parts[0];
    return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
  }

  function isLikelyHungarianPhone(value: string) {
    const raw = value
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/\(/g, "")
      .replace(/\)/g, "");
    return /^\+36\d{9}$/.test(raw) || /^06\d{9}$/.test(raw) || /^36\d{9}$/.test(raw);
  }

  function formatHufAmount(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("hu-HU").format(value) + " Ft";
  }

  async function loadProfile() {
    setLoading(true);
    setMsg("");

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id ?? null;

    setUserId(uid);

    if (!uid) {
      setMsg("A profil megtekintéséhez előbb jelentkezz be.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,email,phone,phone_verified,profile_image_url")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    const profile = data as ProfileRow | null;

    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? sessionData.session?.user?.email ?? "");
    setPhone(profile?.phone ?? "");
    setPhoneVerified(!!profile?.phone_verified);

    setLoading(false);
  }

  async function loadPendingReviews(uid: string) {
    const { data, error } = await supabase
      .from("listings")
      .select("id,title,user_id,winner_user_id,closed_at,final_price,image_urls")
      .or(`user_id.eq.${uid},winner_user_id.eq.${uid}`)
      .not("winner_user_id", "is", null)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false });

    if (error) return;

    const rows = (data ?? []) as ReviewCandidate[];
    const allowed: ReviewCandidate[] = [];
    const relatedUserIds: string[] = [];

    for (const row of rows) {
      const otherUserId = row.user_id === uid ? row.winner_user_id : row.user_id;
      if (!otherUserId) continue;

      const { data: canReview } = await supabase.rpc("can_review_listing", {
        p_listing_id: row.id,
        p_reviewed_user_id: otherUserId,
      });

      if (canReview) {
        allowed.push(row);
        relatedUserIds.push(otherUserId);
      }
    }

    setPendingReviews(allowed);

    if (relatedUserIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", Array.from(new Set(relatedUserIds)));

      const nextNames: Record<string, string> = {};
      (profileRows ?? []).forEach((item: any) => {
        nextNames[item.id] = toPublicName(item.full_name);
      });
      setOtherPartyNames(nextNames);
    } else {
      setOtherPartyNames({});
    }
  }

  async function loadReviews(uid: string) {
    const { data: myData } = await supabase
      .from("listing_reviews")
      .select(`
        id,rating,comment,created_at,listing_id,reviewer_user_id,reviewed_user_id,
        listings(title)
      `)
      .eq("reviewer_user_id", uid)
      .order("created_at", { ascending: false });

    const { data: receivedData } = await supabase
      .from("listing_reviews")
      .select(`
        id,rating,comment,created_at,listing_id,reviewer_user_id,reviewed_user_id,
        listings(title)
      `)
      .eq("reviewed_user_id", uid)
      .order("created_at", { ascending: false });

    const receivedRows = (receivedData ?? []) as ReviewRow[];
    const reviewerIds = Array.from(new Set(receivedRows.map((r) => r.reviewer_user_id)));

    if (reviewerIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", reviewerIds);

      const nextNames: Record<string, string> = {};
      (profileRows ?? []).forEach((item: any) => {
        nextNames[item.id] = toPublicName(item.full_name);
      });
      setReviewerNames(nextNames);
    } else {
      setReviewerNames({});
    }

    setMyReviews((myData ?? []) as ReviewRow[]);
    setReceivedReviews(receivedRows);
  }

  async function loadAllProfileData() {
    setLoading(true);
    setMsg("");

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id ?? null;

    setUserId(uid);

    if (!uid) {
      setMsg("A profil megtekintéséhez előbb jelentkezz be.");
      setLoading(false);
      return;
    }

    await loadProfile();
    await loadPendingReviews(uid);
    await loadReviews(uid);
    setLoading(false);
  }

  async function saveProfile() {
    setMsg("");

    if (!userId) {
      toast.error("Előbb jelentkezz be.");
      return;
    }

    if (!fullName.trim()) {
      toast.error("Add meg a teljes neved.");
      return;
    }

    if (!email.trim()) {
      toast.error("Add meg az e-mail címedet.");
      return;
    }

    if (!phone.trim()) {
      toast.error("Add meg a telefonszámodat.");
      return;
    }

    if (!isLikelyHungarianPhone(phone.trim())) {
      toast.error("Adj meg érvényes telefonszámot. Példa: +36301234567");
      return;
    }

    setSaving(true);

    try {
      const { data: current } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", userId)
        .maybeSingle();

      const oldPhone = (current as { phone?: string } | null)?.phone ?? "";
      const phoneChanged = oldPhone.trim() !== phone.trim();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          phone_verified: phoneChanged ? false : phoneVerified,
        })
        .eq("id", userId);

      if (error) {
        setMsg(error.message);
        toast.error("Nem sikerült menteni a profilt.");
        return;
      }

      if (phoneChanged) {
        setPhoneVerified(false);
        setSmsCode("");
        setMsg("Profil mentve. A telefonszám módosult, ezért újra hitelesíteni kell.");
        toast.success("Profil mentve, a telefonszám újrahitelesítést igényel.");
      } else {
        setMsg("Profil mentve.");
        toast.success("Profil mentve.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendVerificationSms() {
    setMsg("");

    if (!phone.trim()) {
      toast.error("Adj meg telefonszámot.");
      return;
    }

    if (!isLikelyHungarianPhone(phone.trim())) {
      toast.error("Adj meg érvényes telefonszámot. Példa: +36301234567");
      return;
    }

    setSendingSms(true);

    try {
      const res = await fetch("/api/send-verification-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || "Nem sikerült elküldeni az SMS kódot.");
        toast.error("Nem sikerült elküldeni az SMS kódot.");
        return;
      }

      setMsg("SMS kód elküldve a telefonszámodra.");
      toast.success("SMS kód elküldve.");
    } finally {
      setSendingSms(false);
    }
  }

  async function verifyPhone() {
    setMsg("");

    if (!userId) {
      toast.error("Előbb jelentkezz be.");
      return;
    }

    if (!smsCode.trim()) {
      toast.error("Add meg az SMS-ben kapott kódot.");
      return;
    }

    setVerifyingSms(true);

    try {
      const res = await fetch("/api/check-verification-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim(),
          code: smsCode.trim(),
          userId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || "Nem sikerült ellenőrizni az SMS kódot.");
        toast.error("Sikertelen SMS ellenőrzés.");
        return;
      }

      setPhoneVerified(true);
      setSmsCode("");
      setMsg("Telefonszám sikeresen hitelesítve.");
      toast.success("Telefonszám hitelesítve.");
    } finally {
      setVerifyingSms(false);
    }
  }

  async function submitReview(row: ReviewCandidate) {
    if (!userId) return;

    const otherUserId = row.user_id === userId ? row.winner_user_id : row.user_id;

    if (!otherUserId) {
      toast.error("Nem található a másik fél.");
      return;
    }

    const rating = Number(reviewRatings[row.id] ?? "0");
    const comment = (reviewComments[row.id] ?? "").trim();

    if (!rating || rating < 1 || rating > 5) {
      toast.error("Adj meg 1 és 5 közötti értékelést.");
      return;
    }

    const { error } = await supabase.from("listing_reviews").insert({
      listing_id: row.id,
      reviewer_user_id: userId,
      reviewed_user_id: otherUserId,
      rating,
      comment: comment || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Értékelés elküldve.");
    await loadPendingReviews(userId);
    await loadReviews(userId);
  }

  useEffect(() => {
    loadAllProfileData();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAllProfileData();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-10 w-48 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A profil megtekintéséhez előbb jelentkezz be.
            </p>
            <Button asChild>
              <a href="/login">Belépés / Regisztráció</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generatedPublicName = toPublicName(fullName);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profilom</h1>
        <p className="text-sm text-muted-foreground">
          Itt tudod kezelni a fiókod adatait és az értékeléseidet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fiókadatok</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teljes név</label>
              <Input
                placeholder="pl. Kovács Péter"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nyilvánosan megjelenő név</label>
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {generatedPublicName || "Automatikusan generálva a nevedből"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">E-mail</label>
            <Input
              placeholder="pelda@email.hu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Telefonszám</label>
            <Input
              placeholder="+36301234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="rounded-xl border bg-background/60 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Phone className="h-4 w-4" />
              Telefonszám hitelesítése
            </div>

            <div className="mt-2 text-muted-foreground">
              Állapot:{" "}
              {phoneVerified ? (
                <span className="font-medium text-green-600">Hitelesítve</span>
              ) : (
                <span className="font-medium text-amber-600">Nincs hitelesítve</span>
              )}
            </div>

            {!phoneVerified && (
              <>
                <div className="mt-2 text-xs text-muted-foreground">
                  A licitáláshoz és a hirdetésfeladáshoz hitelesített telefonszám szükséges.
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendVerificationSms}
                    disabled={sendingSms}
                  >
                    {sendingSms ? "SMS küldése..." : "SMS kód küldése"}
                  </Button>

                  <div className="flex flex-1 gap-2">
                    <Input
                      placeholder="SMS kód"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />

                    <Button
                      type="button"
                      onClick={verifyPhone}
                      disabled={verifyingSms || !smsCode.trim()}
                    >
                      {verifyingSms ? "Ellenőrzés..." : "Ellenőrzés"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button className="w-full sm:w-auto" onClick={saveProfile} disabled={saving}>
            {saving ? "Mentés..." : "Mentés"}
          </Button>

          {msg && (
            <div className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
              {msg}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leadható értékelések</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingReviews.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Jelenleg nincs leadható értékelésed.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingReviews.map((row) => {
                const otherUserId = row.user_id === userId ? row.winner_user_id : row.user_id;
                const otherName = otherUserId ? otherPartyNames[otherUserId] || "Ismeretlen felhasználó" : "Ismeretlen felhasználó";

                return (
                  <div key={row.id} className="rounded-[1.5rem] border p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {row.image_urls?.[0] ? (
                        <img
                          src={row.image_urls[0]}
                          alt={row.title}
                          className="h-28 w-full rounded-2xl object-cover sm:w-28"
                        />
                      ) : (
                        <div className="h-28 w-full rounded-2xl bg-muted sm:w-28" />
                      )}

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-900">{row.title}</div>
                          <Badge variant="secondary" className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {otherName}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Lezárva: {row.closed_at ? new Date(row.closed_at).toLocaleString() : "-"}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Végső ár: {formatHufAmount(row.final_price)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <select
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                        value={reviewRatings[row.id] ?? ""}
                        onChange={(e) =>
                          setReviewRatings((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      >
                        <option value="">Adj értékelést</option>
                        <option value="5">5 - Kiváló</option>
                        <option value="4">4 - Jó</option>
                        <option value="3">3 - Rendben</option>
                        <option value="2">2 - Gyenge</option>
                        <option value="1">1 - Rossz</option>
                      </select>

                      <Textarea
                        placeholder="Írj rövid véleményt..."
                        value={reviewComments[row.id] ?? ""}
                        onChange={(e) =>
                          setReviewComments((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        className="min-h-[110px]"
                      />

                      <Button onClick={() => submitReview(row)}>Értékelés elküldése</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kapott értékeléseim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {receivedReviews.length === 0 ? (
              <div className="text-sm text-muted-foreground">Még nincs kapott értékelésed.</div>
            ) : (
              receivedReviews.map((row) => (
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
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Általam adott értékelések</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myReviews.length === 0 ? (
              <div className="text-sm text-muted-foreground">Még nem adtál értékelést.</div>
            ) : (
              myReviews.map((row) => (
                <div key={row.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">Értékelésem</div>
                    <Badge className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {row.rating}/5
                    </Badge>
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
    </div>
  );
}