"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCcw, ImageIcon, Gavel, CircleCheck, CircleX, Repeat2, BarChart3 } from "lucide-react";

type Stats = {
  createdToday: number;
  imagesUploadedToday: number;
  expiredToday: number;
  successfulExpiredToday: number;
  unsuccessfulExpiredToday: number;
  renewedToday: number;
};

type ListingWithBids = {
  id: string;
  image_urls: string[] | null;
  bids?: { count: number }[];
};

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    createdToday: 0,
    imagesUploadedToday: 0,
    expiredToday: 0,
    successfulExpiredToday: 0,
    unsuccessfulExpiredToday: 0,
    renewedToday: 0,
  });

  async function loadStats() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email ?? "";
    const admin = email === "fmate2000@gmail.com";
    setIsAdmin(admin);

    if (!admin) {
      setLoading(false);
      return;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const nowIso = new Date().toISOString();

    const { data: createdTodayRows, error: createdError } = await supabase
      .from("listings")
      .select("id,image_urls")
      .gte("created_at", startIso);

    if (createdError) {
      setLoading(false);
      return;
    }

    const { data: expiredTodayRows, error: expiredError } = await supabase
      .from("listings")
      .select("id,bids(count)")
      .gte("ends_at", startIso)
      .lte("ends_at", nowIso);

    if (expiredError) {
      setLoading(false);
      return;
    }

    const { count: renewedTodayCount, error: renewedError } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .not("last_renewed_at", "is", null)
      .gte("last_renewed_at", startIso)
      .lte("last_renewed_at", nowIso);

    if (renewedError) {
      setLoading(false);
      return;
    }

    const createdRows = (createdTodayRows ?? []) as ListingWithBids[];
    const expiredRows = (expiredTodayRows ?? []) as ListingWithBids[];

    const imagesUploadedToday = createdRows.reduce((sum, item) => {
      return sum + ((item.image_urls ?? []).length || 0);
    }, 0);

    const successfulExpiredToday = expiredRows.filter(
      (item) => (item.bids?.[0]?.count ?? 0) > 0
    ).length;

    const unsuccessfulExpiredToday = expiredRows.filter(
      (item) => (item.bids?.[0]?.count ?? 0) === 0
    ).length;

    setStats({
      createdToday: createdRows.length,
      imagesUploadedToday,
      expiredToday: expiredRows.length,
      successfulExpiredToday,
      unsuccessfulExpiredToday,
      renewedToday: renewedTodayCount ?? 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  const successRate = useMemo(() => {
    if (stats.expiredToday === 0) return 0;
    return Math.round((stats.successfulExpiredToday / stats.expiredToday) * 100);
  }, [stats]);

  if (!loading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nincs hozzáférés</CardTitle>
          <CardDescription>Ez az oldal csak admin számára érhető el.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
              <Shield className="h-4 w-4" />
              Admin statisztikák
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Napi piactér teljesítmény
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Itt látod, mi történt ma a Liciterán: új aukciók, képek, lejárt aukciók,
              sikeres zárások és megújítások.
            </p>
          </div>

          <Button variant="outline" className="rounded-xl" onClick={loadStats}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Frissítés
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Mai új aukciók
            </div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.createdToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              Mai képfeltöltések
            </div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.imagesUploadedToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Gavel className="h-4 w-4" />
              Mai lejáratok
            </div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.expiredToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CircleCheck className="h-4 w-4" />
              Sikeres lejáratok
            </div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.successfulExpiredToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CircleX className="h-4 w-4" />
              Licit nélkül lejárt
            </div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.unsuccessfulExpiredToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Repeat2 className="h-4 w-4" />
              Mai megújítások
            </div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.renewedToday}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-[1.75rem] lg:col-span-2">
          <CardHeader>
            <CardTitle>Mai összkép</CardTitle>
            <CardDescription>
              Gyors operatív áttekintés a mai nap teljesítményéről.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Sikerességi arány</div>
              <div className="mt-2 text-3xl font-black text-slate-900">
                {loading ? "…" : `${successRate}%`}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                A mai lejárt aukciók közül ennyi zárult legalább egy licittel.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Átlagos kép / új aukció</div>
              <div className="mt-2 text-3xl font-black text-slate-900">
                {loading
                  ? "…"
                  : stats.createdToday > 0
                  ? (stats.imagesUploadedToday / stats.createdToday).toFixed(1)
                  : "0.0"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Segít látni, mennyire részletesek az újonnan feladott hirdetések.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Mai megújítások jelentése</div>
              <div className="mt-2 text-3xl font-black text-slate-900">
                {loading ? "…" : stats.renewedToday}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Ennyi licit nélkül lejárt hirdetést újítottak meg ma a felhasználók.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Következő admin lépések</CardTitle>
            <CardDescription>Ezeket érdemes utána bekötni.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="rounded-xl border p-3">Reportolt hirdetések moderálása</div>
            <div className="rounded-xl border p-3">Felhasználói figyelmeztetések / tiltások</div>
            <div className="rounded-xl border p-3">Automatikus megújítások felügyelete</div>
            <div className="rounded-xl border p-3">Heti és havi trendek</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}