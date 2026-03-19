"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield,
  FileWarning,
  Trash2,
  BarChart3,
  Users,
  RefreshCcw,
  Wallet,
} from "lucide-react";

type Stats = {
  createdToday: number;
  expiredToday: number;
  successfulExpiredToday: number;
  unsuccessfulExpiredToday: number;
  imagesUploadedToday: number;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    createdToday: 0,
    expiredToday: 0,
    successfulExpiredToday: 0,
    unsuccessfulExpiredToday: 0,
    imagesUploadedToday: 0,
  });

  const [targetUserId, setTargetUserId] = useState("");
  const [targetBalance, setTargetBalance] = useState("-2000");
  const [adjustmentNote, setAdjustmentNote] = useState("Stripe topup teszt");
  const [balanceActionLoading, setBalanceActionLoading] = useState(false);
  const [balanceActionResult, setBalanceActionResult] = useState<{
    message: string;
    currentBalance?: number;
    targetBalance?: number;
    adjustmentAmount?: number;
    user?: {
      id?: string;
      email?: string | null;
      full_name?: string | null;
    };
  } | null>(null);

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

    const { data: createdTodayRows } = await supabase
      .from("listings")
      .select("id,image_urls")
      .gte("created_at", startIso);

    const { data: expiredTodayRows } = await supabase
      .from("listings")
      .select("id")
      .gte("ends_at", startIso)
      .lte("ends_at", nowIso);

    const { data: endedWithBidsRows } = await supabase
      .from("listings")
      .select("id,bids(count)")
      .gte("ends_at", startIso)
      .lte("ends_at", nowIso);

    const createdRows = createdTodayRows ?? [];
    const imageCount = createdRows.reduce((sum: number, item: any) => {
      return sum + ((item.image_urls ?? []).length || 0);
    }, 0);

    const endedRows = endedWithBidsRows ?? [];
    const successful = endedRows.filter((item: any) => (item.bids?.[0]?.count ?? 0) > 0).length;
    const unsuccessful = endedRows.filter((item: any) => (item.bids?.[0]?.count ?? 0) === 0).length;

    setStats({
      createdToday: createdRows.length,
      expiredToday: (expiredTodayRows ?? []).length,
      successfulExpiredToday: successful,
      unsuccessfulExpiredToday: unsuccessful,
      imagesUploadedToday: imageCount,
    });

    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function setTestBalance() {
    if (balanceActionLoading) return;

    const trimmedUserId = targetUserId.trim();
    const numericTargetBalance = Number(targetBalance);

    if (!trimmedUserId) {
      toast.error("Add meg a felhasználó user ID-ját.");
      return;
    }

    if (!Number.isFinite(numericTargetBalance)) {
      toast.error("Adj meg érvényes célegyenleget.");
      return;
    }

    if (numericTargetBalance > 0) {
      toast.error("A célegyenleg csak 0 vagy negatív lehet.");
      return;
    }

    setBalanceActionLoading(true);
    setBalanceActionResult(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("Lejárt a munkamenet. Jelentkezz be újra.");
        return;
      }

      const res = await fetch("/api/admin/set-test-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: trimmedUserId,
          targetBalance: numericTargetBalance,
          note: adjustmentNote.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült beállítani a teszt egyenleget.");
        return;
      }

      setBalanceActionResult(data);
      toast.success(data?.message || "Teszt egyenleg sikeresen beállítva.");
    } finally {
      setBalanceActionLoading(false);
    }
  }

  const adminCards = useMemo(
    () => [
      {
        title: "Törlési kérelmek",
        description: "A felhasználók által küldött aukciótörlési kérelmek áttekintése és elbírálása.",
        href: "/admin/delete-requests",
        icon: Trash2,
        badge: "Működik",
      },
      {
        title: "Reportok",
        description: "Bejelentett hirdetések, felhasználók és moderációs folyamatok egy helyen.",
        href: "/admin/reports",
        icon: FileWarning,
        badge: "Következő",
      },
      {
        title: "Napi statisztikák",
        description: "Lásd, mi történt ma a piactéren: új aukciók, képek, lejáratok és sikeres zárások.",
        href: "/admin/stats",
        icon: BarChart3,
        badge: "Következő",
      },
      {
        title: "Felhasználók",
        description: "Későbbi admin funkció: figyelmeztetések, tiltások, státuszok kezelése.",
        href: "/admin/users",
        icon: Users,
        badge: "Hamarosan",
      },
      {
        title: "Automatikus megújítások",
        description: "A licit nélkül lejárt aukciók automatikus újraindításának felügyelete és szabályozása.",
        href: "/admin/renewals",
        icon: RefreshCcw,
        badge: "Tervezett",
      },
    ],
    []
  );

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
              Admin felület
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Licitera admin központ
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Innen éred el az összes admin eszközt: moderáció, kérelmek, statisztikák és a későbbi üzemeltetési funkciók.
            </p>
          </div>

          <Button variant="outline" className="rounded-xl" onClick={loadStats}>
            Frissítés
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Mai új aukciók</div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.createdToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Mai képfeltöltések</div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.imagesUploadedToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Mai lejáratok</div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.expiredToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Sikeres lejáratok</div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.successfulExpiredToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem]">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Licit nélkül lejárt</div>
            <div className="mt-2 text-3xl font-black">{loading ? "…" : stats.unsuccessfulExpiredToday}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Wallet className="h-5 w-5 text-slate-700" />
            </div>
            <Badge variant="secondary">Teszt eszköz</Badge>
          </div>

          <div>
            <CardTitle className="text-lg">Teszt egyenleg beállítása</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Itt tudsz egy felhasználónak manuálisan 0 vagy negatív teszt egyenleget beállítani.
              A rendszer ezt ledger korrekciós tétellel végzi, így ugyanúgy működik, mint az éles egyenleglogika.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Felhasználó user ID</label>
              <Input
                placeholder="pl. 40c1b4ac-76d9-4d84-bf69-03ec51437674"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cél egyenleg</label>
              <Input
                placeholder="-2000"
                value={targetBalance}
                onChange={(e) => setTargetBalance(e.target.value)}
                className="rounded-xl"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Megjegyzés</label>
              <Input
                placeholder="pl. Stripe topup teszt"
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setTargetBalance("-500")}>
              -500 Ft
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setTargetBalance("-2000")}>
              -2000 Ft
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setTargetBalance("-10000")}>
              -10000 Ft
            </Button>
            <Button className="rounded-xl" onClick={setTestBalance} disabled={balanceActionLoading}>
              {balanceActionLoading ? "Beállítás..." : "Teszt egyenleg beállítása"}
            </Button>
          </div>

          {balanceActionResult ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <div className="font-medium text-emerald-800">{balanceActionResult.message}</div>

              {balanceActionResult.user ? (
                <div className="mt-2 space-y-1 text-emerald-700">
                  <div>
                    <span className="font-medium">Felhasználó:</span>{" "}
                    {balanceActionResult.user.full_name || "Névtelen"}{" "}
                    {balanceActionResult.user.email ? `(${balanceActionResult.user.email})` : ""}
                  </div>
                  <div>
                    <span className="font-medium">User ID:</span> {balanceActionResult.user.id}
                  </div>
                  <div>
                    <span className="font-medium">Korábbi egyenleg:</span>{" "}
                    {balanceActionResult.currentBalance ?? "-"} Ft
                  </div>
                  <div>
                    <span className="font-medium">Új cél egyenleg:</span>{" "}
                    {balanceActionResult.targetBalance ?? "-"} Ft
                  </div>
                  <div>
                    <span className="font-medium">Korrekciós tétel:</span>{" "}
                    {balanceActionResult.adjustmentAmount ?? "-"} Ft
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <Badge variant="secondary">{item.badge}</Badge>
                </div>

                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {item.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {item.href === "/admin/delete-requests" ||
                item.href === "/admin/stats" ||
                item.href === "/admin/reports" ? (
                  <Button className="w-full rounded-xl" asChild>
                    <a href={item.href}>Megnyitás</a>
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full rounded-xl" disabled>
                    Hamarosan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}