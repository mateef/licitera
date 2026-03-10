"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  phone_verified: boolean | null;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [msg, setMsg] = useState("");

  function isLikelyHungarianPhone(value: string) {
    const raw = value
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/\(/g, "")
      .replace(/\)/g, "");
    return /^\+36\d{9}$/.test(raw) || /^06\d{9}$/.test(raw) || /^36\d{9}$/.test(raw);
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
      .select("id,full_name,email,phone,phone_verified")
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

  useEffect(() => {
    loadProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profilom</h1>
        <p className="text-sm text-muted-foreground">
          Itt tudod kezelni a fiókod alapadatait.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fiókadatok</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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

          <div className="rounded-xl border bg-background/60 p-3 text-sm">
            <div className="font-medium">Telefonszám hitelesítése</div>
            <div className="mt-1 text-muted-foreground">
              Állapot:{" "}
              {phoneVerified ? (
                <span className="font-medium text-green-600">Hitelesítve</span>
              ) : (
                <span className="font-medium text-amber-600">Nincs hitelesítve</span>
              )}
            </div>
            {!phoneVerified && (
              <div className="mt-2 text-xs text-muted-foreground">
                A licitáláshoz és a hirdetésfeladáshoz hitelesített telefonszám szükséges.
              </div>
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
          <CardTitle>Hamarosan itt lesz</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Erre az oldalra kerül majd az értékelésed, az egyenleged, a tranzakcióid és a
          kapcsolódó statisztikák is.
        </CardContent>
      </Card>
    </div>
  );
}