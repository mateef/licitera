"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Wallet, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type SubscriptionTier = "free" | "standard" | "pro";

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

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);

  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [changingPlan, setChangingPlan] = useState<SubscriptionTier | null>(null);

  const [monthlyFreeQuota, setMonthlyFreeQuota] = useState(0);
  const [remainingFreeQuota, setRemainingFreeQuota] = useState(0);
  const [usedSuccessfulSales, setUsedSuccessfulSales] = useState(0);
  const [currentMonthFeeTotal, setCurrentMonthFeeTotal] = useState(0);

  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [stripeCustomerPortalUrlLoading, setStripeCustomerPortalUrlLoading] = useState(false);
  const [nextBillingDate, setNextBillingDate] = useState<string>("");

  const [topupStatusMessage, setTopupStatusMessage] = useState("");
  const [topupStatusType, setTopupStatusType] = useState<"success" | "cancel" | "">("");

  const [subscriptionStatusMessage, setSubscriptionStatusMessage] = useState("");
  const [subscriptionStatusType, setSubscriptionStatusType] = useState<
    "success" | "cancel" | ""
  >("");

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

      const res = await fetch("/api/stripe/subscription-status", {
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

      setNextBillingDate(data?.currentPeriodEnd ?? "");
    } finally {
      setSubscriptionLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);

    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;

    if (!uid) {
      setLoading(false);
      return;
    }

    const { data: balanceData } = await supabase
      .from("billing_user_balances")
      .select("balance_amount")
      .eq("user_id", uid)
      .maybeSingle();

    const rawBalance = Number((balanceData as any)?.balance_amount ?? 0);
    setBalance(Math.min(0, rawBalance));

    const { data: profileData } = await supabase
      .from("profiles")
      .select("subscription_tier,subscription_status")
      .eq("id", uid)
      .maybeSingle();

    setSubscriptionTier(((profileData as any)?.subscription_tier ?? "free") as SubscriptionTier);
    setSubscriptionStatus((profileData as any)?.subscription_status ?? "active");

    const { data: quotaRow } = await supabase
      .from("billing_monthly_quota_usage")
      .select("monthly_free_quota, remaining_free_quota, used_successful_sales")
      .eq("user_id", uid)
      .maybeSingle();

    setMonthlyFreeQuota((quotaRow as any)?.monthly_free_quota ?? 0);
    setRemainingFreeQuota((quotaRow as any)?.remaining_free_quota ?? 0);
    setUsedSuccessfulSales((quotaRow as any)?.used_successful_sales ?? 0);

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

    await loadStripeSubscriptionStatus(uid);

    setLoading(false);
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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült elindítani az egyenlegrendezést.");
        return;
      }

      if (!data?.url) {
        toast.error("Hiányzik a Stripe checkout URL.");
        return;
      }

      window.location.href = data.url;
    } finally {
      setTopupLoading(false);
    }
  }

  async function changeSubscription(tier: SubscriptionTier) {
    if (tier === "free") {
      toast.info(
        "Az ingyenes csomagra váltást lemondással tudod intézni az előfizetéskezelőben."
      );
      return;
    }

    if (subscriptionTier === "pro" && tier === "standard") {
      toast.info("Pro csomagról Standard csomagra váltás nem elérhető.");
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

      const isPaidPlan = subscriptionTier === "standard" || subscriptionTier === "pro";

      if (isPaidPlan) {
        const res = await fetch("/api/stripe/change-subscription-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ tier }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          toast.error(data?.error || "Nem sikerült módosítani az előfizetést.");
          return;
        }

        toast.success("Az előfizetés módosítva lett.");
        await loadData();
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

  const currentPlan = useMemo(() => {
    return (
      SUBSCRIPTION_PLANS.find((plan) => plan.key === subscriptionTier) ?? SUBSCRIPTION_PLANS[0]
    );
  }, [subscriptionTier]);

  const currentMonthlyFee =
    subscriptionTier === "standard" ? 1490 : subscriptionTier === "pro" ? 2990 : 0;

  const transactionRule =
    subscriptionTier === "free"
      ? "2,5% / eladott tétel, maximum 2000 Ft aukciónként"
      : subscriptionTier === "standard"
        ? "0 Ft havi 10 aukcióig, utána alapdíj"
        : "0 Ft havi 20 aukcióig, utána alapdíj";

  if (loading) {
    return <div className="mx-auto max-w-5xl p-6">Betöltés...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.9),rgba(255,255,255,0.96),rgba(245,208,254,0.75))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
              Billing
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
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="text-sm text-muted-foreground">Jelenlegi egyenleg</div>

            <div
              className={`mt-2 text-3xl font-black ${
                balance < 0 ? "text-red-600" : "text-slate-900"
              }`}
            >
              {formatHufAmount(balance)}
            </div>

            {balance < 0 ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Negatív egyenleg esetén nem tudsz új aukciót indítani.
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Az egyenleged rendben van, jelenleg nincs tartozásod.
              </div>
            )}

            <Button
              className="mt-4 w-full"
              onClick={handleTopup}
              disabled={topupLoading || balance >= 0}
            >
              {topupLoading ? "Betöltés..." : "Egyenleg rendezése"}
            </Button>

            <div className="mt-3 text-xs text-muted-foreground">
              A fizetés Stripe-on keresztül történik, a számla emailben érkezik.
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
              <Wallet className="h-4 w-4" />
              Díjkimutatás
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Havi előfizetési díj</span>
                <span className="font-semibold">{formatHufAmount(currentMonthlyFee)}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Tranzakciós szabály</span>
                <span className="max-w-[220px] text-right font-semibold">{transactionRule}</span>
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
                <span className="text-muted-foreground">Díjplafon</span>
                <span className="font-semibold">2 000 Ft / aukció</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="text-xs uppercase tracking-wide text-slate-500">Jelenlegi csomag</div>

            <div className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Crown className="h-5 w-5" />
              {currentPlan.name}
            </div>

            <div className="mt-1 text-sm text-slate-600">{currentPlan.priceLabel}</div>

            <div className="mt-3">
              <Badge variant="secondary">
                {subscriptionLoading
                  ? "Betöltés..."
                  : subscriptionStatus === "active"
                    ? "Aktív"
                    : subscriptionStatus}
              </Badge>
            </div>

            {subscriptionTier !== "free" && nextBillingDate ? (
              <div className="mt-3 text-sm text-slate-600">
                Következő terhelés:{" "}
                <span className="font-medium text-slate-900">
                  {formatDisplayDate(nextBillingDate)}
                </span>
              </div>
            ) : null}

            {subscriptionTier !== "free" ? (
              <>
                <div className="mt-2 text-xs text-slate-500">
                  Lemondás az aktuális számlázási időszak végére indítható az előfizetéskezelőben.
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Az előfizetés számlája automatikusan emailben kerül kiküldésre.
                </div>

                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={openCustomerPortal}
                  disabled={stripeCustomerPortalUrlLoading}
                >
                  {stripeCustomerPortalUrlLoading
                    ? "Betöltés..."
                    : "Előfizetés kezelése / lemondás"}
                </Button>
              </>
            ) : null}
          </div>

          <div className="grid gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = plan.key === subscriptionTier;
              const isDowngradeFromProToStandard =
                subscriptionTier === "pro" && plan.key === "standard";
              const isUpgrade = subscriptionTier === "standard" && plan.key === "pro";
              const canSelectWithCheckout =
                subscriptionTier === "free" &&
                (plan.key === "standard" || plan.key === "pro");
              const canChangePlan = isUpgrade || canSelectWithCheckout;

              return (
                <div
                  key={plan.key}
                  className={`flex h-full flex-col rounded-[1.75rem] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : "border-slate-200/80 bg-white/95"
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

                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">
                    {plan.description}
                  </p>

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
                    ) : isDowngradeFromProToStandard ? (
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" disabled>
                          Nem váltható
                        </Button>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                          Pro csomagról Standard csomagra váltás nem érhető el. Lemondást az
                          előfizetéskezelőben tudsz indítani.
                        </div>
                      </div>
                    ) : canChangePlan ? (
                      <Button
                        className="w-full"
                        onClick={() => changeSubscription(plan.key)}
                        disabled={changingPlan !== null}
                      >
                        {changingPlan === plan.key
                          ? "Átirányítás..."
                          : subscriptionTier === "standard" && plan.key === "pro"
                            ? "Váltás Pro csomagra"
                            : "Csomag kiválasztása"}
                      </Button>
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
            <div
              key={row.label}
              className="grid grid-cols-4 border-b last:border-b-0 text-sm"
            >
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
        <p>
          Az egyenleged csak 0 vagy negatív lehet, pozitív összeget a rendszer nem tárol. Az
          előfizetés Stripe-on keresztül kezelhető, a következő terhelés dátuma itt jelenik meg, a
          lemondás és a fizetési mód kezelése pedig a Stripe ügyfélportálon érhető el. Az
          egyenlegrendezés szintén Stripe-on keresztül történik. A számla automatikusan emailben
          kerül kiküldésre.
        </p>
      </div>
    </div>
  );
}