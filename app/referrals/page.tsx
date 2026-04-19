"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Copy,
  Gift,
  Sparkles,
  Users,
} from "lucide-react";

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("hu-HU");
}

function Condition({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Circle className="h-4 w-4 text-slate-300" />
      )}
      <span className={done ? "font-medium text-emerald-700" : "text-slate-600"}>
        {children}
      </span>
    </div>
  );
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReferralSummaryRow | null>(null);
  const [rows, setRows] = useState<ReferralDashboardRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [summaryRes, dashboardRes] = await Promise.all([
        supabase.rpc("get_my_referral_summary"),
        supabase.rpc("get_my_referral_dashboard"),
      ]);

      if (summaryRes.error) {
        toast.error(summaryRes.error.message);
      } else {
        const row = Array.isArray(summaryRes.data)
          ? (summaryRes.data[0] as ReferralSummaryRow | undefined) ?? null
          : null;

        setSummary(row);
      }

      if (dashboardRes.error) {
        toast.error(dashboardRes.error.message);
      } else {
        setRows((dashboardRes.data ?? []) as ReferralDashboardRow[]);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-12 w-64 rounded-2xl bg-muted" />
        <div className="h-64 rounded-[2rem] bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.88),rgba(255,255,255,0.97),rgba(245,208,254,0.72))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Meghívások
            </Badge>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Saját meghívókód és jutalmak
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Itt látod a saját meghívókódodat, a meghívott felhasználókat, és azt is,
              hogy melyik feltétel teljesült náluk.
            </p>
          </div>

          <Button asChild variant="outline" className="rounded-full">
            <Link href="/profile">Vissza a profilra</Link>
          </Button>
        </div>
      </section>

      <Card className="rounded-[1.75rem] border-slate-200/80">
        <CardHeader>
          <CardTitle>Saját meghívókód</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Gift className="h-4 w-4" />
              Meghívókód
            </div>

            <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {summary?.referral_code ?? "—"}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!summary?.referral_code) return;
                  await navigator.clipboard.writeText(summary.referral_code);
                  toast.success("A meghívókód kimásolva.");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Kód másolása
              </Button>

              <Button
                onClick={async () => {
                  if (!summary?.referral_code) return;
                  const text = `Csatlakozz a Liciterához az én meghívókódommal: ${summary.referral_code}`;
                  await navigator.clipboard.writeText(text);
                  toast.success("A meghívó szöveg kimásolva.");
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Meghívó szöveg másolása
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Összes meghívott</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.total_invites ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Jutalmazott meghívások</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.total_rewarded ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Aktív Pro előny lejárata</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {formatDateTime(summary?.active_pro_campaign_until)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            <div className="font-semibold">Jutalom feltételei</div>
            <div className="mt-2 space-y-2">
              <Condition done={false}>1. Regisztráció meghívókóddal</Condition>
              <Condition done={false}>2. Telefonszám hitelesítése</Condition>
              <Condition done={false}>3. Első licit vagy első hirdetésfeladás</Condition>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200/80">
        <CardHeader>
          <CardTitle>Meghívottak állapota</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Még nincs meghívott felhasználód.
            </div>
          ) : (
            rows.map((row) => {
              const registered = true;
              const phoneVerified = !!row.phone_verified;
              const didAction = !!row.first_bid_at || !!row.first_listing_at;
              const rewarded = !!row.reward_granted_at;

              return (
                <div key={row.invite_id} className="rounded-[1.5rem] border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {row.invited_full_name || row.invited_email || "Meghívott felhasználó"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Regisztrált: {formatDateTime(row.created_at)}
                      </div>
                    </div>

                    <Badge variant="secondary">{row.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <Condition done={registered}>Regisztráció kész</Condition>
                    <Condition done={phoneVerified}>Telefonszám hitelesítve</Condition>
                    <Condition done={didAction}>
                      Első licit vagy első hirdetésfeladás megtörtént
                    </Condition>
                    <Condition done={rewarded}>Jutalom jóváírva</Condition>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <div>Első licit: {formatDateTime(row.first_bid_at)}</div>
                    <div className="mt-1">Első hirdetés: {formatDateTime(row.first_listing_at)}</div>
                    <div className="mt-1">Jutalom lejárata: {formatDateTime(row.reward_ends_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}