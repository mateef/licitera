"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BadgeCheck,
  ExternalLink,
  Phone,
  Sparkles,
  Copy,
  Gift,
  Users,
  Star,
  UserRound,
  Wallet,
  ArrowRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  profile_image_url: string | null;
  public_display_name?: string | null;
  subscription_tier?: "free" | "standard" | "pro" | null;
  subscription_status?: string | null;
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

type SubscriptionTier = "free" | "standard" | "pro";

type ReferralSummaryRow = {
  referral_code: string;
  total_invites: number;
  total_rewarded: number;
  active_pro_campaign_until: string | null;
};

type ReferralDashboardRow = {
  invite_id: string;
  invited_user_id: string;
  invited_email: string | null;
  invited_full_name: string | null;
  phone_verified: boolean;
  first_bid_at: string | null;
  first_listing_at: string | null;
  qualified_at: string | null;
  reward_granted_at: string | null;
  reward_ends_at: string | null;
  status: string;
  created_at: string;
};

const [referralSummary, setReferralSummary] = useState<ReferralSummaryRow | null>(null);
const [referralDashboard, setReferralDashboard] = useState<ReferralDashboardRow[]>([]);

const SUBSCRIPTION_LABELS: Record<SubscriptionTier, string> = {
  free: "Ingyenes",
  standard: "Standard",
  pro: "Pro",
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [sendingSms, setSendingSms] = useState(false);
  const [verifyingSms, setVerifyingSms] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [smsCode, setSmsCode] = useState("");

  const [msg, setMsg] = useState("");

  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");

  const [balanceAmount, setBalanceAmount] = useState(0);
  const [currentMonthFeeTotal, setCurrentMonthFeeTotal] = useState(0);
  const [monthlyFreeQuota, setMonthlyFreeQuota] = useState(0);
  const [remainingFreeQuota, setRemainingFreeQuota] = useState(0);
  const [usedSuccessfulSales, setUsedSuccessfulSales] = useState(0);

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

  async function loadProfile(uid: string) {
    const { data: sessionData } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id,full_name,email,phone,phone_verified,profile_image_url,public_display_name,subscription_tier,subscription_status"
      )
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }

    const profile = data as ProfileRow | null;

    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? sessionData.session?.user?.email ?? "");
    setPhone(profile?.phone ?? "");
    setPhoneVerified(!!profile?.phone_verified);
    setSubscriptionTier((profile?.subscription_tier as SubscriptionTier | null) ?? "free");
    setSubscriptionStatus(profile?.subscription_status ?? "active");
  }

  async function loadReferralData() {
  const [summaryRes, dashboardRes] = await Promise.all([
    supabase.rpc("get_my_referral_summary"),
    supabase.rpc("get_my_referral_dashboard"),
  ]);

  if (!summaryRes.error) {
    const row = Array.isArray(summaryRes.data)
      ? (summaryRes.data[0] as ReferralSummaryRow | undefined) ?? null
      : null;

    setReferralSummary(row);
  }

  if (!dashboardRes.error) {
    setReferralDashboard((dashboardRes.data ?? []) as ReferralDashboardRow[]);
  }
}

  async function loadBillingSummary(uid: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [balanceRow, monthFees, quotaRow] = await Promise.all([
      supabase
        .from("billing_user_balances")
        .select("balance_amount")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("billing_fee_events")
        .select("fee_amount")
        .eq("seller_user_id", uid)
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("billing_monthly_quota_usage")
        .select("monthly_free_quota, remaining_free_quota, used_successful_sales")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    setBalanceAmount(Number((balanceRow.data as any)?.balance_amount ?? 0));

    const totalMonthFee =
      (monthFees.data ?? []).reduce(
        (sum: number, row: any) => sum + Number(row?.fee_amount ?? 0),
        0
      ) || 0;

    setCurrentMonthFeeTotal(totalMonthFee);
    setMonthlyFreeQuota(Number((quotaRow.data as any)?.monthly_free_quota ?? 0));
    setRemainingFreeQuota(Number((quotaRow.data as any)?.remaining_free_quota ?? 0));
    setUsedSuccessfulSales(Number((quotaRow.data as any)?.used_successful_sales ?? 0));
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

    await Promise.all([
      loadProfile(uid),
      loadBillingSummary(uid),
      loadPendingReviews(uid),
      loadReviews(uid),
      loadReferralData(),
    ]);

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
          public_display_name: toPublicName(fullName.trim()),
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
        body: JSON.stringify({ phone: phone.trim() }),
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

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Biztosan törölni szeretnéd a Licitera fiókodat? Ez a művelet nem vonható vissza."
    );

    if (!confirmed) return;

    const finalConfirmed = window.confirm(
      "Utolsó megerősítés: a fiókodhoz tartozó hozzáférés megszűnik, és a törlési folyamat elindul. Folytatod?"
    );

    if (!finalConfirmed) return;

    setDeleteLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("A fiók törléséhez előbb jelentkezz be.");
        return;
      }

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült törölni a fiókot.");
        return;
      }

      await supabase.auth.signOut();
      toast.success("A fiók törlése sikeres volt.");
      window.location.href = "/login";
    } catch (e: any) {
      toast.error(e?.message || "Nem sikerült törölni a fiókot.");
    } finally {
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    loadAllProfileData();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAllProfileData();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const generatedPublicName = toPublicName(fullName);

  const planLabel = useMemo(() => {
    return SUBSCRIPTION_LABELS[subscriptionTier] ?? "Ingyenes";
  }, [subscriptionTier]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-48 rounded bg-muted" />
        <div className="h-72 rounded-[2rem] bg-muted" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-[2rem]">
          <CardContent className="space-y-4 p-6">
            <div className="text-2xl font-bold text-slate-900">Profil</div>
            <p className="text-sm text-slate-500">
              A profil megtekintéséhez előbb jelentkezz be.
            </p>
            <Button asChild>
              <Link href="/login">Belépés / Regisztráció</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.88),rgba(255,255,255,0.97),rgba(245,208,254,0.72))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Saját profil
              </Badge>

              {phoneVerified ? (
                <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                  Telefonszám hitelesítve
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Telefonszám nincs hitelesítve
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Profilom
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Itt tudod kezelni a fiókadataidat és az értékeléseidet. Az egyenleg, előfizetés és
              számlázás külön a Billing oldalon érhető el.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="rounded-full">
              <Link href={`/profile/${userId}`}>
                Nyilvános profil
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild className="rounded-full">
              <Link href="/my-listings">Saját aukciók</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-[1.75rem] border-slate-200/80 lg:col-span-2">
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
                <div className="flex h-11 items-center rounded-xl border bg-slate-50 px-3 text-sm text-slate-600">
                  {generatedPublicName || "Automatikusan generálva"}
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

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Phone className="h-4 w-4" />
                Telefonszám hitelesítése
              </div>

              <div className="mt-2 text-sm text-slate-600">
                Állapot:{" "}
                {phoneVerified ? (
                  <span className="font-medium text-emerald-600">Hitelesítve</span>
                ) : (
                  <span className="font-medium text-amber-600">Nincs hitelesítve</span>
                )}
              </div>

              {!phoneVerified ? (
                <>
                  <div className="mt-2 text-xs text-slate-500">
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
              ) : null}
            </div>

            <Button className="w-full sm:w-auto" onClick={saveProfile} disabled={saving}>
              {saving ? "Mentés..." : "Mentés"}
            </Button>

            {msg ? (
              <div className="rounded-xl border bg-white p-3 text-sm text-slate-600">{msg}</div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Egyenleg és előfizetés</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Aktív csomag</div>
              <div className="mt-2 text-lg font-bold text-slate-900">{planLabel}</div>
              <div className="mt-2">
                <Badge variant="secondary">
                  {subscriptionStatus === "active" ? "Aktív" : subscriptionStatus}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Wallet className="h-4 w-4" />
                Billing összefoglaló
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Jelenlegi egyenleg</span>
                  <span
                    className={
                      balanceAmount < 0
                        ? "font-semibold text-red-600"
                        : "font-semibold text-emerald-600"
                    }
                  >
                    {formatHufAmount(balanceAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Ebben a hónapban felszámított díj</span>
                  <span className="font-semibold text-slate-900">
                    {formatHufAmount(currentMonthFeeTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Sikeres eladások</span>
                  <span className="font-semibold text-slate-900">{usedSuccessfulSales} db</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Havi díjmentes kvóta</span>
                  <span className="font-semibold text-slate-900">{monthlyFreeQuota} db</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Hátralévő kvóta</span>
                  <span className="font-semibold text-slate-900">{remainingFreeQuota} db</span>
                </div>
              </div>
            </div>

            {balanceAmount < 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Az egyenleged negatív. Rendezd a Billing oldalon, mert ez korlátozhatja az új
                aukció feladását.
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                Az egyenleged rendben van.
              </div>
            )}

            <Button asChild className="w-full rounded-xl">
              <Link href="/billing">
                Egyenleg és előfizetés kezelése
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <div className="text-xs text-slate-500">
              A Stripe-os fizetés, előfizetés-kezelés, lemondás és egyenlegrendezés a Billing
              oldalon érhető el.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200/80">
  <CardHeader>
    <CardTitle>Meghívások és jutalmak</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <Gift className="h-4 w-4" />
        Saját meghívókód
      </div>

      <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
        {referralSummary?.referral_code ?? "—"}
      </div>

      <div className="mt-2 text-sm text-slate-500">
        Ha valaki ezzel regisztrál, hitelesíti a telefonszámát, és licitál vagy hirdetést ad fel,
        akkor jutalmat kapsz.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            if (!referralSummary?.referral_code) return;
            await navigator.clipboard.writeText(referralSummary.referral_code);
            toast.success("Meghívókód kimásolva.");
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Kód másolása
        </Button>

        <Button asChild>
          <Link href="/referrals">Részletek megnyitása</Link>
        </Button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          Összes meghívott
        </div>
        <div className="mt-2 text-xl font-bold text-slate-900">
          {referralSummary?.total_invites ?? 0}
        </div>
      </div>

      <div className="rounded-2xl border bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Gift className="h-4 w-4" />
          Jutalmazott meghívások
        </div>
        <div className="mt-2 text-xl font-bold text-slate-900">
          {referralSummary?.total_rewarded ?? 0}
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
      Aktív Pro előny lejárata:{" "}
      <span className="font-semibold">
        {referralSummary?.active_pro_campaign_until
          ? new Date(referralSummary.active_pro_campaign_until).toLocaleString("hu-HU")
          : "nincs aktív jutalom"}
      </span>
    </div>
  </CardContent>
</Card>

      <Card className="rounded-[1.75rem] border-red-200 bg-red-50/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Fiók törlése
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm leading-6 text-slate-700">
            A fiók törlése végleges művelet. A hozzáférésed megszűnik, és a rendszer elindítja a
            fiókhoz kapcsolódó személyes adatok törlését vagy anonimizálását. Bizonyos adatokat
            jogszabályi vagy biztonsági okból továbbra is megőrizhetünk.
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                A művelet nem vonható vissza. Csak akkor folytasd, ha biztosan törölni szeretnéd
                a fiókodat.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={deleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Fiók törlése..." : "Fiók végleges törlése"}
            </Button>

            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/delete-account">Részletes tájékoztató</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200/80">
        <CardHeader>
          <CardTitle>Leadható értékelések</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {pendingReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Jelenleg nincs leadható értékelésed.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingReviews.map((row) => {
                const otherUserId = row.user_id === userId ? row.winner_user_id : row.user_id;
                const otherName = otherUserId
                  ? otherPartyNames[otherUserId] || "Ismeretlen felhasználó"
                  : "Ismeretlen felhasználó";

                return (
                  <div key={row.id} className="rounded-[1.5rem] border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      {row.image_urls?.[0] ? (
                        <img
                          src={row.image_urls[0]}
                          alt={row.title}
                          className="h-28 w-full rounded-2xl object-cover sm:w-28"
                        />
                      ) : (
                        <div className="h-28 w-full rounded-2xl bg-slate-100 sm:w-28" />
                      )}

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-900">{row.title}</div>
                          <Badge variant="secondary" className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {otherName}
                          </Badge>
                        </div>

                        <div className="text-sm text-slate-500">
                          Lezárva: {row.closed_at ? new Date(row.closed_at).toLocaleString("hu-HU") : "-"}
                        </div>

                        <div className="text-sm text-slate-500">
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
        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Kapott értékeléseim</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {receivedReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Még nincs kapott értékelésed.
              </div>
            ) : (
              receivedReviews.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-900">
                      {reviewerNames[row.reviewer_user_id] || "Ismeretlen felhasználó"}
                    </div>
                    <Badge className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {row.rating}/5
                    </Badge>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Hirdetés: {row.listings?.[0]?.title ?? "Ismeretlen hirdetés"}
                  </div>

                  {row.comment ? <div className="mt-3 text-sm text-slate-700">{row.comment}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Általam adott értékelések</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {myReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Még nem adtál értékelést.
              </div>
            ) : (
              myReviews.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-900">Értékelésem</div>
                    <Badge className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {row.rating}/5
                    </Badge>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Hirdetés: {row.listings?.[0]?.title ?? "Ismeretlen hirdetés"}
                  </div>

                  {row.comment ? <div className="mt-3 text-sm text-slate-700">{row.comment}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}