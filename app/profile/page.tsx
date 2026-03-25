"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Star,
  UserRound,
  Phone,
  Crown,
  Wallet,
  CheckCircle2,
  Sparkles,
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
type SubscriptionSource = "free" | "stripe" | "app_store" | "play_store";

type BillingEntryRow = {
  id: string;
  entry_type: string;
  amount: number;
  description: string;
  created_at: string;
};

const SUBSCRIPTION_PLANS: {
  key: SubscriptionTier;
  name: string;
  priceLabel: string;
  description: string;
  badge?: string;
  features: string[];
}[] = [
  {
    key: "free",
    name: "Ingyenes",
    priceLabel: "0 Ft / hó",
    description:
      "Kezdő és alkalmi eladóknak. Nincs havi díj, de sikeres eladásnál rendszerhasználati díj kerül felszámításra.",
    features: [
      "2,5% rendszerhasználati díj eladott tételenként",
      "Maximum 2000 Ft aukciónként",
      "Korlátlan böngészés és licitálás",
    ],
  },
  {
    key: "standard",
    name: "Standard",
    priceLabel: "1490 Ft / hó",
    badge: "Ajánlott",
    description:
      "Gyakori eladóknak. Havi 10 aukcióig nincs tranzakciós díj, utána az alapdíjazás érvényes.",
    features: [
      "Havi 10 aukcióig nincs tranzakciós díj",
      "Stabil havi költségtervezés",
      "Minden alapfunkció elérhető",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceLabel: "2990 Ft / hó",
    badge: "Kiemelt",
    description:
      "Aktív eladóknak. Automatikus kiemelés és havi 20 aukcióig nincs extra tranzakciós költség.",
    features: [
      "Automatikus kiemelés a többi hirdetéssel szemben",
      "Havi 20 aukcióig nincs tranzakciós díj",
      "Nagyobb láthatóság és több licit esély",
    ],
  },
];

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

  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [changingPlan, setChangingPlan] = useState<SubscriptionTier | null>(null);
  const [subscriptionSource, setSubscriptionSource] = useState<SubscriptionSource>("free");

  const [balanceAmount, setBalanceAmount] = useState(0);
  const [currentMonthFeeTotal, setCurrentMonthFeeTotal] = useState(0);
  const [currentMonthSuccessfulSales, setCurrentMonthSuccessfulSales] = useState(0);
  const [recentBillingEntries, setRecentBillingEntries] = useState<BillingEntryRow[]>([]);

  const [pendingReviews, setPendingReviews] = useState<ReviewCandidate[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewRow[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ReviewRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [otherPartyNames, setOtherPartyNames] = useState<Record<string, string>>({});
  const [topupLoading, setTopupLoading] = useState(false);

  const [reviewRatings, setReviewRatings] = useState<Record<string, string>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

  const [monthlyFreeQuota, setMonthlyFreeQuota] = useState(0);
  const [remainingFreeQuota, setRemainingFreeQuota] = useState(0);
  const [usedSuccessfulSales, setUsedSuccessfulSales] = useState(0);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [nextBillingDate, setNextBillingDate] = useState<string>("");
  const [stripeCustomerPortalUrlLoading, setStripeCustomerPortalUrlLoading] = useState(false);

  function toPublicName(fullNameValue: string | null | undefined) {
    if (!fullNameValue) return "Ismeretlen felhasználó";
    const parts = fullNameValue.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Ismeretlen felhasználó";
    if (parts.length === 1) return parts[0];
    return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
  }

  function formatDisplayDate(value: string | null | undefined) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function isLikelyHungarianPhone(value: string) {
    const raw = value
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/\(/g, "")
      .replace(/\)/g, "");
    return /^\+36\d{9}$/.test(raw) || /^06\d{9}$/.test(raw) || /^36\d{9}$/.test(raw);
  }

  async function handleBalanceTopup() {
    if (topupLoading) return;

    setTopupLoading(true);

    try {
      toast.info(
        "Az online egyenlegrendezés hamarosan elérhető lesz. A következő lépésben Stripe fizetést kötünk rá."
      );
    } finally {
      setTopupLoading(false);
    }
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
      .select(
        "id,full_name,email,phone,phone_verified,profile_image_url,public_display_name,subscription_tier,subscription_status"
      )
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
    setSubscriptionTier((profile?.subscription_tier as SubscriptionTier | null) ?? "free");
    setSubscriptionStatus(profile?.subscription_status ?? "active");

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

  async function loadBillingData(uid: string) {
    const { data: balanceRow } = await supabase
      .from("billing_user_balances")
      .select("balance_amount")
      .eq("user_id", uid)
      .maybeSingle();

    setBalanceAmount((balanceRow as any)?.balance_amount ?? 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthFees } = await supabase
      .from("billing_fee_events")
      .select("fee_amount")
      .eq("seller_user_id", uid)
      .gte("created_at", monthStart.toISOString());

    const totalMonthFee =
      (monthFees ?? []).reduce((sum: number, row: any) => sum + (row.fee_amount ?? 0), 0) ?? 0;

    setCurrentMonthFeeTotal(totalMonthFee);

    const { count } = await supabase
      .from("billing_fee_events")
      .select("*", { count: "exact", head: true })
      .eq("seller_user_id", uid)
      .gte("created_at", monthStart.toISOString());

    setCurrentMonthSuccessfulSales(count ?? 0);

    const { data: ledgerRows } = await supabase
      .from("billing_ledger")
      .select("id,entry_type,amount,description,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(8);

    const { data: quotaRow } = await supabase
      .from("billing_monthly_quota_usage")
      .select("monthly_free_quota, remaining_free_quota, used_successful_sales")
      .eq("user_id", uid)
      .maybeSingle();

    setMonthlyFreeQuota((quotaRow as any)?.monthly_free_quota ?? 0);
    setRemainingFreeQuota((quotaRow as any)?.remaining_free_quota ?? 0);
    setUsedSuccessfulSales((quotaRow as any)?.used_successful_sales ?? 0);
    setRecentBillingEntries((ledgerRows ?? []) as BillingEntryRow[]);
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
    await loadBillingData(uid);
    await loadStripeSubscriptionStatus(uid);
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

  async function loadStripeSubscriptionStatus(uid: string) {
    if (!uid) return;

    setSubscriptionLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        return;
      }

      const res = await fetch("/api/subscription-status", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        return;
      }

      if (data?.subscriptionTier) {
        setSubscriptionTier(data.subscriptionTier);
      }

      if (data?.subscriptionStatus) {
        setSubscriptionStatus(data.subscriptionStatus);
      }

      if (data?.subscriptionSource) {
        setSubscriptionSource(data.subscriptionSource as SubscriptionSource);
      }

      setNextBillingDate(data?.currentPeriodEnd ?? "");
    } finally {
      setSubscriptionLoading(false);
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

  async function changeSubscription(tier: SubscriptionTier) {
    if (!userId) return;

    if (tier === "free") {
      toast.info("Az ingyenes csomagra váltást a lemondással kezeljük.");
      return;
    }

    if (subscriptionSource === "app_store" || subscriptionSource === "play_store") {
      toast.info(
        "Ezt az előfizetést mobilon vásároltad meg, ezért a módosítás az App Store / Google Play előfizetések között érhető el."
      );
      return;
    }

    setChangingPlan(tier);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("Lejárt a munkamenet. Jelentkezz be újra.");
        return;
      }

      const res = await fetch("/api/stripe/create-subscription-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült elindítani az előfizetést.");
        return;
      }

      if (!data?.url) {
        toast.error("Hiányzik a Stripe checkout URL.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setChangingPlan(null);
    }
  }

  async function openCustomerPortal() {
    setStripeCustomerPortalUrlLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("Lejárt a munkamenet. Jelentkezz be újra.");
        return;
      }

      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült megnyitni az előfizetéskezelőt.");
        return;
      }

      if (!data?.url) {
        toast.error("Hiányzik a Customer Portal URL.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setStripeCustomerPortalUrlLoading(false);
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

  const currentPlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find((plan) => plan.key === subscriptionTier) ?? SUBSCRIPTION_PLANS[0];
  }, [subscriptionTier]);

  const currentMonthlyFee =
    subscriptionTier === "standard" ? 1490 : subscriptionTier === "pro" ? 2990 : 0;

  const transactionRule =
    subscriptionTier === "free"
      ? "2,5% / eladott tétel, maximum 2000 Ft aukciónként"
      : subscriptionTier === "standard"
      ? "0 Ft havi 10 aukcióig, utána alapdíj"
      : "0 Ft havi 20 aukcióig, utána alapdíj";

  const hasPaidSubscription =
    subscriptionTier === "standard" || subscriptionTier === "pro";

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profilom</h1>
        <p className="text-sm text-muted-foreground">
          Itt tudod kezelni a fiókod adatait, előfizetésedet és értékeléseidet.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
            <CardTitle>Aktív csomag és díjak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Jelenlegi csomag</div>
              <div className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Crown className="h-5 w-5" />
                {currentPlan.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">{currentPlan.priceLabel}</div>
              <div className="mt-3">
                <Badge variant="secondary">
                  {subscriptionStatus === "active" ? "Aktív" : subscriptionStatus}
                </Badge>
              </div>

              {subscriptionTier !== "free" && nextBillingDate && (
                <div className="mt-3 text-sm text-slate-600">
                  Következő terhelés:{" "}
                  <span className="font-medium text-slate-900">
                    {formatDisplayDate(nextBillingDate)}
                  </span>
                </div>
              )}

              {subscriptionTier !== "free" && subscriptionSource === "stripe" && (
                <div className="mt-2 text-xs text-slate-500">
                  Az előfizetés számlája automatikusan emailben kerül kiküldésre.
                </div>
              )}

              {subscriptionTier !== "free" &&
                (subscriptionSource === "app_store" || subscriptionSource === "play_store") && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    Ezt az előfizetést mobilon vásároltad meg, ezért a kezelése az App Store /
                    Google Play előfizetések között érhető el.
                  </div>
                )}
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <Wallet className="h-4 w-4" />
                Egyenleg és díjkimutatás
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Havi előfizetési díj</span>
                  <span className="font-semibold">{formatHufAmount(currentMonthlyFee)}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Tranzakciós szabály</span>
                  <span className="max-w-[180px] text-right font-semibold">{transactionRule}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sikeres eladások ebben a hónapban</span>
                  <span className="font-semibold">{usedSuccessfulSales} db</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Havi díjmentes kvóta</span>
                  <span className="font-semibold">{monthlyFreeQuota} db</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hátralévő díjmentes kvóta</span>
                  <span className="font-semibold">{remainingFreeQuota} db</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ebben a hónapban felszámított díj</span>
                  <span className="font-semibold">{formatHufAmount(currentMonthFeeTotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jelenlegi egyenleg</span>
                  <span
                    className={`font-semibold ${
                      balanceAmount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatHufAmount(balanceAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Díjplafon</span>
                  <span className="font-semibold">2 000 Ft / aukció</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-3 text-sm font-medium text-slate-900">Egyenleg rendezése</div>

              {balanceAmount < 0 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                    <div className="font-medium text-red-700">
                      Az egyenleged negatív: {formatHufAmount(balanceAmount)}
                    </div>
                    <div className="mt-1 text-red-600">
                      Amíg ezt nem rendezed, új aukciót nem tudsz indítani.
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleBalanceTopup}
                    disabled={topupLoading}
                  >
                    {topupLoading ? "Betöltés..." : "Rendezem az egyenleget"}
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    Hamarosan online fizetéssel is rendezhető lesz az egyenleged.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
                    <div className="font-medium text-green-700">Az egyenleged rendben van.</div>
                    <div className="mt-1 text-green-600">Jelenleg nincs szükség rendezésre.</div>
                  </div>

                  <Button variant="outline" className="w-full" disabled>
                    Egyenleg rendezése
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-3 text-sm font-medium text-slate-900">Legutóbbi díjbejegyzések</div>

              {recentBillingEntries.length === 0 ? (
                <div className="text-sm text-muted-foreground">Még nincs díj- vagy egyenlegmozgás.</div>
              ) : (
                <div className="space-y-3">
                  {recentBillingEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{entry.description}</div>
                        <div
                          className={
                            entry.amount < 0
                              ? "font-semibold text-red-600"
                              : "font-semibold text-green-600"
                          }
                        >
                          {entry.amount > 0 ? "+" : ""}
                          {formatHufAmount(entry.amount)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Előfizetések</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = plan.key === subscriptionTier;

              return (
                <div
                  key={plan.key}
                  className={`rounded-[1.5rem] border p-5 transition ${
                    isCurrent ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{plan.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{plan.priceLabel}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {plan.badge ? <Badge>{plan.badge}</Badge> : null}
                      {isCurrent ? <Badge variant="secondary">Jelenlegi</Badge> : null}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>

                  <div className="mt-4 space-y-2">
                    {plan.features.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2">
                    {isCurrent ? (
                      <>
                        <Button className="w-full" variant="secondary" disabled>
                          {subscriptionLoading ? "Betöltés..." : "Aktív csomag"}
                        </Button>

                        {plan.key !== "free" && subscriptionSource === "stripe" && (
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={openCustomerPortal}
                            disabled={stripeCustomerPortalUrlLoading}
                          >
                            {stripeCustomerPortalUrlLoading
                              ? "Betöltés..."
                              : "Előfizetés kezelése / lemondás"}
                          </Button>
                        )}

                        {plan.key !== "free" &&
                          (subscriptionSource === "app_store" ||
                            subscriptionSource === "play_store") && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                              Ezt az előfizetést mobilon vásároltad meg, ezért a kezelése az App
                              Store / Google Play előfizetések között érhető el.
                            </div>
                          )}
                      </>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => changeSubscription(plan.key)}
                        disabled={
                          changingPlan !== null ||
                          subscriptionSource === "app_store" ||
                          subscriptionSource === "play_store"
                        }
                      >
                        {changingPlan === plan.key
                          ? "Átirányítás..."
                          : plan.key === "free"
                          ? "Ingyenes csomag"
                          : "Csomag kiválasztása"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border">
            <div className="grid grid-cols-4 border-b bg-slate-50 text-sm font-medium">
              <div className="p-4">Funkció</div>
              <div className="p-4 text-center">Ingyenes</div>
              <div className="p-4 text-center">Standard</div>
              <div className="p-4 text-center">Pro</div>
            </div>

            {[
              {
                label: "Licitálás és vásárlás",
                free: "Igen",
                standard: "Igen",
                pro: "Igen",
              },
              {
                label: "Hirdetés feladása",
                free: "Igen",
                standard: "Igen",
                pro: "Igen",
              },
              {
                label: "Lejárt, licit nélküli hirdetések 2x-i megújítása",
                free: "Igen",
                standard: "Igen",
                pro: "Igen",
              },
              {
                label: "Rendszerhasználati díj",
                free: "2,5%, max. 2000 Ft",
                standard: "0 Ft 10 aukcióig / hó",
                pro: "0 Ft 20 aukcióig / hó",
              },
              {
                label: "Automatikus kiemelés",
                free: "Nem",
                standard: "Nem",
                pro: "Igen",
              },
              {
                label: "Havi díj",
                free: "0 Ft",
                standard: "1490 Ft",
                pro: "2990 Ft",
              },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-4 border-b last:border-b-0 text-sm">
                <div className="p-4 font-medium text-slate-900">{row.label}</div>
                <div className="p-4 text-center text-slate-600">{row.free}</div>
                <div className="p-4 text-center text-slate-600">{row.standard}</div>
                <div className="p-4 text-center text-slate-600">{row.pro}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
              <Sparkles className="h-4 w-4" />
              Fontos
            </div>

            {subscriptionSource === "stripe" ? (
              <p>
                Az előfizetések Stripe-on keresztül kerülnek terhelésre. A következő terhelés dátuma
                a profilban jelenik meg, a lemondás és a fizetési mód kezelése pedig a Stripe
                ügyfélportálon érhető el. A számla automatikusan emailben kerül kiküldésre.
              </p>
            ) : subscriptionSource === "app_store" || subscriptionSource === "play_store" ? (
              <p>
                Ezt az előfizetést mobilon vásároltad meg, ezért a módosítás és a lemondás az App
                Store / Google Play előfizetések között érhető el. A webes Stripe ügyfélportál ehhez
                a csomaghoz nem használható.
              </p>
            ) : (
              <p>
                Jelenleg nincs aktív fizetős előfizetésed. Az egyenleged csak 0 vagy negatív lehet,
                pozitív összeget a rendszer nem tárol.
              </p>
            )}
          </div>
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
                const otherName = otherUserId
                  ? otherPartyNames[otherUserId] || "Ismeretlen felhasználó"
                  : "Ismeretlen felhasználó";

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