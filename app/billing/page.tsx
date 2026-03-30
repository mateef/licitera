"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Crown,
  Receipt,
  Sparkles,
  Wallet,
  AlertTriangle,
} from "lucide-react";

type SubscriptionTier = "free" | "standard" | "pro";
type SubscriptionSource = "free" | "stripe" | "app_store" | "play_store" | "mobile_store";

type BillingOverview = {
  balance: number;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
  subscriptionSource?: SubscriptionSource;
  nextBillingDate: string;
  monthlyFreeQuota: number;
  remainingFreeQuota: number;
  usedSuccessfulSales: number;
  currentMonthFeeTotal: number;
};

type FeeRow = {
  id: string;
  listing_id: string | null;
  fee_amount: number | null;
  created_at: string;
  fee_type: string | null;
  listing_title: string | null;
  final_price: number | null;
  current_price: number | null;
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

function formatHufAmount(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("hu-HU").format(value) + " Ft";
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

function getTransactionRule(tier: SubscriptionTier) {
  if (tier === "free") return "2,5% / eladott tétel, maximum 2000 Ft aukciónként";
  if (tier === "standard") return "0 Ft havi 10 aukcióig, utána alapdíj";
  return "0 Ft havi 20 aukcióig, utána alapdíj";
}

function getMonthlyFee(tier: SubscriptionTier) {
  if (tier === "standard") return 1490;
  if (tier === "pro") return 2990;
  return 0;
}

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<BillingOverview>({
    balance: 0,
    subscriptionTier: "free",
    subscriptionStatus: "active",
    subscriptionSource: "free",
    nextBillingDate: "",
    monthlyFreeQuota: 0,
    remainingFreeQuota: 0,
    usedSuccessfulSales: 0,
    currentMonthFeeTotal: 0,
  });

  const [feeRows, setFeeRows] = useState<FeeRow[]>([]);

  const [planLoading, setPlanLoading] = useState<SubscriptionTier | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [topupStatusMessage, setTopupStatusMessage] = useState("");
  const [topupStatusType, setTopupStatusType] = useState<"success" | "cancel" | "">("");
  const [subscriptionStatusMessage, setSubscriptionStatusMessage] = useState("");
  const [subscriptionStatusType, setSubscriptionStatusType] = useState<"success" | "cancel" | "">("");

  const currentPlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find((plan) => plan.key === data.subscriptionTier) ?? SUBSCRIPTION_PLANS[0];
  }, [data.subscriptionTier]);

  const hasPaidSubscription = data.subscriptionTier === "standard" || data.subscriptionTier === "pro";
  const effectiveSubscriptionSource: SubscriptionSource =
    data.subscriptionSource === "free" && hasPaidSubscription
      ? "stripe"
      : data.subscriptionSource || "free";

  async function loadFeeRows(uid: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: rows, error } = await supabase
      .from("billing_fee_events_with_listing")
      .select("id,listing_id,fee_amount,created_at,fee_type,listing_title,final_price,current_price")
      .eq("seller_user_id", uid)
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      setFeeRows([]);
      return;
    }

    setFeeRows((rows ?? []) as FeeRow[]);
  }

  async function loadSubscriptionStatus(accessToken: string) {
    const res = await fetch("/api/subscription-status", {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) return null;

    return payload as {
      subscriptionTier?: SubscriptionTier;
      subscriptionStatus?: string;
      subscriptionSource?: SubscriptionSource;
      currentPeriodEnd?: string;
    };
  }

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setAuthLoading(false);

      if (!uid) {
        setLoading(false);
        return;
      }

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [balanceRes, profileRes, quotaRes, feeEventsRes] = await Promise.all([
        supabase
          .from("billing_user_balances")
          .select("balance_amount")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("subscription_tier,subscription_status,subscription_source")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("billing_monthly_quota_usage")
          .select("monthly_free_quota,remaining_free_quota,used_successful_sales")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("billing_fee_events")
          .select("fee_amount")
          .eq("seller_user_id", uid)
          .gte("created_at", monthStart.toISOString()),
      ]);

      const rawBalance = Number((balanceRes.data as any)?.balance_amount ?? 0);
      const profileTier = (((profileRes.data as any)?.subscription_tier ?? "free") as SubscriptionTier) || "free";
      const profileStatus = ((profileRes.data as any)?.subscription_status ?? "active") as string;
      const profileSource = ((profileRes.data as any)?.subscription_source ?? null) as SubscriptionSource | null;

      const totalMonthFee =
        (feeEventsRes.data ?? []).reduce(
          (sum: number, row: any) => sum + Number(row?.fee_amount ?? 0),
          0
        ) || 0;

      let nextBillingDate = "";
      let subscriptionTier = profileTier;
      let subscriptionStatus = profileStatus;
      let subscriptionSource: SubscriptionSource =
        (profileSource ?? (profileTier === "free" ? "free" : "stripe")) as SubscriptionSource;

      if (session?.access_token) {
        const subStatus = await loadSubscriptionStatus(session.access_token);
        if (subStatus?.subscriptionTier) subscriptionTier = subStatus.subscriptionTier;
        if (subStatus?.subscriptionStatus) subscriptionStatus = subStatus.subscriptionStatus;
        if (subStatus?.subscriptionSource) subscriptionSource = subStatus.subscriptionSource;
        if (subStatus?.currentPeriodEnd) nextBillingDate = subStatus.currentPeriodEnd;
      }

      setData({
        balance: Math.min(0, rawBalance),
        subscriptionTier,
        subscriptionStatus,
        subscriptionSource,
        nextBillingDate,
        monthlyFreeQuota: Number((quotaRes.data as any)?.monthly_free_quota ?? 0),
        remainingFreeQuota: Number((quotaRes.data as any)?.remaining_free_quota ?? 0),
        usedSuccessfulSales: Number((quotaRes.data as any)?.used_successful_sales ?? 0),
        currentMonthFeeTotal: totalMonthFee,
      });

      await loadFeeRows(uid);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const topup = searchParams.get("topup");
    const stripe = searchParams.get("stripe");

    let shouldReload = false;

    if (topup === "success") {
      setTopupStatusType("success");
      setTopupStatusMessage("Sikeres egyenlegrendezés. Az egyenleged frissítve lett.");
      toast.success("Sikeres egyenlegrendezés.");
      shouldReload = true;
    } else if (topup === "cancel") {
      setTopupStatusType("cancel");
      setTopupStatusMessage("Az egyenlegrendezés megszakadt, nem történt terhelés.");
      toast.info("Az egyenlegrendezés megszakadt.");
    }

    if (stripe === "success") {
      setSubscriptionStatusType("success");
      setSubscriptionStatusMessage("Az előfizetés sikeresen aktiválódott vagy frissült.");
      toast.success("Előfizetés sikeresen frissítve.");
      shouldReload = true;
    } else if (stripe === "cancel") {
      setSubscriptionStatusType("cancel");
      setSubscriptionStatusMessage("Az előfizetés indítása megszakadt.");
      toast.info("Az előfizetés indítása megszakadt.");
    }

    if (shouldReload) {
      loadData();
    }

    if (topup || stripe) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("topup");
      params.delete("stripe");
      const query = params.toString();
      router.replace(query ? `/billing?${query}` : "/billing");
    }
  }, [router, searchParams]);

  async function handleTopup() {
    if (topupLoading) return;

    setTopupLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Lejárt a munkamenet. Jelentkezz be újra.");
        return;
      }

      const res = await fetch("/api/stripe/create-balance-topup-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(payload?.error || "Nem sikerült elindítani az egyenlegrendezést.");
        return;
      }

      if (!payload?.url) {
        toast.error("Hiányzik a Stripe checkout URL.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setTopupLoading(false);
    }
  }

  async function changeSubscription(tier: SubscriptionTier) {
    if (tier === "free") {
      toast.info("Az ingyenes csomagra váltást lemondással tudod intézni az előfizetéskezelőben.");
      return;
    }

    if (effectiveSubscriptionSource === "app_store" || effectiveSubscriptionSource === "play_store" || effectiveSubscriptionSource === "mobile_store") {
      toast.info(
        "Ezt az előfizetést mobilon vásároltad meg, ezért a módosítás az App Store / Google Play előfizetések között érhető el."
      );
      return;
    }

    if (hasPaidSubscription) {
      toast.info("Aktív fizetős előfizetés mellett a csomagváltás az előfizetéskezelőben érhető el.");
      return;
    }

    setPlanLoading(tier);

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

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(payload?.error || "Nem sikerült elindítani az előfizetést.");
        return;
      }

      if (!payload?.url) {
        toast.error("Hiányzik a Stripe checkout URL.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setPlanLoading(null);
    }
  }

  async function openCustomerPortal() {
    setPortalLoading(true);

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

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(payload?.error || "Nem sikerült megnyitni az előfizetéskezelőt.");
        return;
      }

      if (!payload?.url) {
        toast.error("Hiányzik a Customer Portal URL.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setPortalLoading(false);
    }
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-6xl p-6">Betöltés...</div>;
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Wallet className="h-7 w-7 text-slate-600" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              Jelentkezz be a számlázáshoz
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-slate-500">
              Az egyenleged, előfizetésed és díjkimutatásod csak bejelentkezve érhető el.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild className="rounded-full px-6">
                <a href="/login">Belépés</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.9),rgba(255,255,255,0.96),rgba(245,208,254,0.75))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
              Számlázás
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Egyenleg és előfizetés
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Itt látod a rendszerhasználati díjaidat, az egyenlegedet és az aktív csomagodat.
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700 backdrop-blur">
            Aktív csomag: <span className="font-semibold text-slate-900">{currentPlan.name}</span>
          </div>
        </div>
      </section>

      {topupStatusMessage ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            topupStatusType === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {topupStatusMessage}
        </div>
      ) : null}

      {subscriptionStatusMessage ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            subscriptionStatusType === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {subscriptionStatusMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Jelenlegi egyenleg</div>
                  <div className={`mt-2 text-3xl font-black ${data.balance < 0 ? "text-red-600" : "text-slate-900"}`}>
                    {formatHufAmount(data.balance)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Wallet className="h-5 w-5 text-slate-700" />
                </div>
              </div>

              {data.balance < 0 ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Negatív egyenleg esetén nem tudsz új aukciót indítani.
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  Az egyenleged rendben van, jelenleg nincs tartozásod.
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="text-sm font-semibold text-indigo-950">Tartozás összetevői</div>
                <div className="mt-2 space-y-1 text-sm text-indigo-900">
                  <div>Ebben a hónapban felszámított díj: {formatHufAmount(data.currentMonthFeeTotal)}</div>
                  <div>Aktív csomag havi díja: {formatHufAmount(getMonthlyFee(data.subscriptionTier))}</div>
                </div>
                <div className="mt-2 text-xs text-indigo-700">
                  Az alábbi listában aukciónként is látod, miből jött össze a terhelés.
                </div>
              </div>

              <Button
                className="mt-4 w-full"
                onClick={handleTopup}
                disabled={topupLoading || data.balance >= 0}
              >
                {topupLoading ? "Betöltés..." : "Egyenleg rendezése"}
              </Button>

              <div className="mt-3 text-xs text-muted-foreground">
                A fizetés Stripe-on keresztül történik, a számla emailben érkezik.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" />
                Díjtételek listingenként
              </CardTitle>
              <CardDescription>Ebben a hónapban felszámított díjak tételes bontásban.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feeRows.length === 0 ? (
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-500">
                  Ebben a hónapban még nincs külön megjeleníthető díjtétel.
                </div>
              ) : (
                feeRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">
                          {row.listing_title || "Ismeretlen hirdetés"}
                        </div>
                      </div>
                      <div className="shrink-0 font-black text-red-600">
                        {formatHufAmount(row.fee_amount ?? 0)}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <div>Dátum: {formatDisplayDate(row.created_at)}</div>
                      <div>Típus: {row.fee_type || "Rendszerhasználati díj"}</div>
                      <div>Záró / aktuális ár: {formatHufAmount(row.final_price ?? row.current_price ?? 0)}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                Díjkimutatás
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Havi előfizetési díj</span>
                  <span className="font-semibold text-slate-900">{formatHufAmount(getMonthlyFee(data.subscriptionTier))}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Tranzakciós szabály</span>
                  <span className="max-w-[220px] text-right font-semibold text-slate-900">{getTransactionRule(data.subscriptionTier)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Sikeres eladások ebben a hónapban</span>
                  <span className="font-semibold text-slate-900">{data.usedSuccessfulSales} db</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Havi díjmentes kvóta</span>
                  <span className="font-semibold text-slate-900">{data.monthlyFreeQuota} db</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Hátralévő díjmentes kvóta</span>
                  <span className="font-semibold text-slate-900">{data.remainingFreeQuota} db</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Ebben a hónapban felszámított díj</span>
                  <span className="font-semibold text-slate-900">{formatHufAmount(data.currentMonthFeeTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Díjplafon</span>
                  <span className="font-semibold text-slate-900">2 000 Ft / aukció</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-wide text-slate-500">Jelenlegi csomag</div>
              <div className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Crown className="h-5 w-5" />
                {currentPlan.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">{currentPlan.priceLabel}</div>

              <div className="mt-3">
                <Badge variant="secondary">
                  {data.subscriptionStatus === "active" ? "Aktív" : data.subscriptionStatus}
                </Badge>
              </div>

              {data.subscriptionTier !== "free" && !!data.nextBillingDate ? (
                <div className="mt-3 text-sm text-slate-600">
                  Következő terhelés:{" "}
                  <span className="font-medium text-slate-900">{formatDisplayDate(data.nextBillingDate)}</span>
                </div>
              ) : null}

              {hasPaidSubscription && effectiveSubscriptionSource === "stripe" ? (
                <>
                  <div className="mt-3 text-xs text-slate-500">
                    Lemondás az aktuális számlázási időszak végére indítható az előfizetéskezelőben.
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Az előfizetés számlája automatikusan emailben kerül kiküldésre.
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={openCustomerPortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? "Betöltés..." : "Előfizetés kezelése / lemondás"}
                  </Button>
                </>
              ) : null}

              {hasPaidSubscription && (effectiveSubscriptionSource === "app_store" || effectiveSubscriptionSource === "play_store" || effectiveSubscriptionSource === "mobile_store") ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Ezt az előfizetést mobilon vásároltad meg, ezért a kezelése az App Store / Google Play előfizetések között érhető el.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = plan.key === data.subscriptionTier;
              const canSelectWithCheckout = !hasPaidSubscription && (plan.key === "standard" || plan.key === "pro");

              return (
                <div
                  key={plan.key}
                  className={`flex h-full flex-col rounded-[1.75rem] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition ${
                    isCurrent ? "border-primary bg-primary/5" : "border-slate-200/80 bg-white/95"
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

                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">{plan.description}</p>

                  <div className="mt-4 min-h-[112px] space-y-2">
                    {plan.features.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-5">
                    {isCurrent ? (
                      <Button className="w-full" variant="secondary" disabled>
                        Aktív csomag
                      </Button>
                    ) : canSelectWithCheckout ? (
                      <Button
                        className="w-full"
                        onClick={() => changeSubscription(plan.key)}
                        disabled={
                          planLoading !== null ||
                          effectiveSubscriptionSource === "app_store" ||
                          effectiveSubscriptionSource === "play_store" ||
                          effectiveSubscriptionSource === "mobile_store"
                        }
                      >
                        {planLoading === plan.key ? "Átirányítás..." : "Csomag kiválasztása"}
                      </Button>
                    ) : hasPaidSubscription && effectiveSubscriptionSource === "stripe" ? (
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" disabled>
                          Előfizetéskezelőben módosítható
                        </Button>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                          Aktív fizetős előfizetés mellett a csomagváltás és a lemondás az „Előfizetés kezelése / lemondás” gombon keresztül érhető el.
                        </div>
                      </div>
                    ) : hasPaidSubscription && (effectiveSubscriptionSource === "app_store" || effectiveSubscriptionSource === "play_store" || effectiveSubscriptionSource === "mobile_store") ? (
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" disabled>
                          Mobilon kezelhető
                        </Button>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                          Ezt az előfizetést mobilon vásároltad meg, ezért a kezelése az App Store / Google Play előfizetések között érhető el.
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        Nem elérhető
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-4 border-b bg-slate-50 text-sm font-medium">
            <div className="p-4">Funkció</div>
            <div className="p-4 text-center">Ingyenes</div>
            <div className="p-4 text-center">Standard</div>
            <div className="p-4 text-center">Pro</div>
          </div>

          {[
            { label: "Licitálás és vásárlás", free: "Igen", standard: "Igen", pro: "Igen" },
            { label: "Hirdetés feladása", free: "Igen", standard: "Igen", pro: "Igen" },
            { label: "Lejárt, licit nélküli hirdetések 2x-i megújítása", free: "Igen", standard: "Igen", pro: "Igen" },
            { label: "Rendszerhasználati díj", free: "2,5%, max. 2000 Ft", standard: "0 Ft 10 aukcióig / hó", pro: "0 Ft 20 aukcióig / hó" },
            { label: "Automatikus kiemelés", free: "Nem", standard: "Nem", pro: "Igen" },
            { label: "Havi díj", free: "0 Ft", standard: "1490 Ft", pro: "2990 Ft" },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-4 border-b last:border-b-0 text-sm">
              <div className="p-4 font-medium text-slate-900">{row.label}</div>
              <div className="p-4 text-center text-slate-600">{row.free}</div>
              <div className="p-4 text-center text-slate-600">{row.standard}</div>
              <div className="p-4 text-center text-slate-600">{row.pro}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
          <Sparkles className="h-4 w-4" />
          Fontos
        </div>

        {effectiveSubscriptionSource === "stripe" ? (
          <p>
            Az egyenleged csak 0 vagy negatív lehet, pozitív összeget a rendszer nem tárol. Az előfizetés Stripe-on keresztül kezelhető, a következő terhelés dátuma itt jelenik meg, a lemondás és a fizetési mód kezelése pedig a Stripe ügyfélportálon érhető el. Az egyenlegrendezés szintén Stripe-on keresztül történik. A számla automatikusan emailben kerül kiküldésre.
          </p>
        ) : effectiveSubscriptionSource === "app_store" || effectiveSubscriptionSource === "play_store" || effectiveSubscriptionSource === "mobile_store" ? (
          <p>
            Az egyenleged csak 0 vagy negatív lehet, pozitív összeget a rendszer nem tárol. Ezt az előfizetést mobilon vásároltad meg, ezért a módosítás és a lemondás az App Store / Google Play előfizetések között érhető el. A webes Stripe ügyfélportál ehhez a csomaghoz nem használható.
          </p>
        ) : (
          <p>
            Az egyenleged csak 0 vagy negatív lehet, pozitív összeget a rendszer nem tárol. Jelenleg nincs aktív fizetős előfizetésed. Az egyenlegrendezés Stripe-on keresztül történik.
          </p>
        )}
      </div>

      {data.balance < 0 ? (
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Figyelmeztetés
          </div>
          Negatív egyenleg mellett új hirdetés feladása korlátozott lehet. Rendezd az egyenlegedet, hogy gond nélkül tudj új aukciót indítani.
        </div>
      ) : null}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl p-6">Betöltés...</div>}>
      <BillingPageContent />
    </Suspense>
  );
}
