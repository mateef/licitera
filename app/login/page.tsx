"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Step = "auth" | "verify";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("auth");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState<
    "signin" | "signup" | "verify" | "resend" | "signout" | null
  >(null);

  function isValidEmail(value: string) {
    return /\S+@\S+\.\S+/.test(value);
  }

  function isLikelyHungarianPhone(value: string) {
    const raw = value.replace(/\s+/g, "").replace(/-/g, "").replace(/\(/g, "").replace(/\)/g, "");
    return /^\+36\d{9}$/.test(raw) || /^06\d{9}$/.test(raw) || /^36\d{9}$/.test(raw);
  }

  async function signUp() {
    setMsg("");
    await supabase.auth.signOut();

    if (!fullName.trim()) {
      setMsg("Add meg a teljes neved.");
      toast.error("Add meg a teljes neved.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setMsg("Adj meg érvényes e-mail címet.");
      toast.error("Adj meg érvényes e-mail címet.");
      return;
    }

    if (!isLikelyHungarianPhone(phone.trim())) {
      setMsg("Adj meg érvényes magyar telefonszámot.");
      toast.error("Adj meg érvényes magyar telefonszámot.");
      return;
    }

    if (password.length < 6) {
      setMsg("A jelszó legalább 6 karakter legyen.");
      toast.error("A jelszó legalább 6 karakter legyen.");
      return;
    }

    setLoading("signup");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(error.message);
        toast.error("Nem sikerült a regisztráció.");
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        setMsg("Nem sikerült létrehozni a felhasználót.");
        toast.error("Nem sikerült létrehozni a felhasználót.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
  {
    id: userId,
    full_name: fullName.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    phone_verified: false,
  },
  {
    onConflict: "id",
  }
);

      if (profileError) {
        setMsg(profileError.message);
        toast.error("Nem sikerült létrehozni a profilt.");
        return;
      }

      const smsRes = await fetch("/api/send-verification-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim(),
        }),
      });

      const smsData = await smsRes.json().catch(() => null);

      if (!smsRes.ok) {
        setMsg(smsData?.error || "Nem sikerült elküldeni az SMS kódot.");
        toast.error("Nem sikerült elküldeni az SMS kódot.");
        return;
      }

      setPendingUserId(userId);
      setPendingPhone(phone.trim());
      setStep("verify");
      setMsg("SMS kód elküldve. Add meg a kapott kódot.");
      toast.success("SMS kód elküldve.");
    } finally {
      setLoading(null);
    }
  }

  async function verifySms() {
    setMsg("");

    if (!pendingUserId) {
      setMsg("Hiányzik a regisztrációs folyamat felhasználóazonosítója.");
      toast.error("Hiányzik a felhasználóazonosító.");
      return;
    }

    if (!smsCode.trim()) {
      setMsg("Add meg az SMS-ben kapott kódot.");
      toast.error("Add meg az SMS-ben kapott kódot.");
      return;
    }

    setLoading("verify");

    try {
      const res = await fetch("/api/check-verification-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: pendingPhone,
          code: smsCode.trim(),
          userId: pendingUserId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || "Nem sikerült ellenőrizni az SMS kódot.");
        toast.error("Sikertelen SMS ellenőrzés.");
        return;
      }

      setMsg("Telefonszám hitelesítve ✅ Most már bejelentkezhetsz.");
      toast.success("Telefonszám hitelesítve.");

      setStep("auth");
      setSmsCode("");
    } finally {
      setLoading(null);
    }
  }

  async function resendSms() {
    setMsg("");

    if (!pendingPhone) {
      setMsg("Hiányzik a telefonszám.");
      toast.error("Hiányzik a telefonszám.");
      return;
    }

    setLoading("resend");

    try {
      const res = await fetch("/api/send-verification-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: pendingPhone,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || "Nem sikerült újraküldeni az SMS kódot.");
        toast.error("Nem sikerült újraküldeni az SMS kódot.");
        return;
      }

      setMsg("Új SMS kód elküldve.");
      toast.success("Új SMS kód elküldve.");
    } finally {
      setLoading(null);
    }
  }

  async function signIn() {
    setMsg("");
    setLoading("signin");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(error.message);
        toast.error("Nem sikerült a belépés.");
        return;
      }

      setMsg("Sikeres belépés ✅");
      toast.success("Sikeres belépés.");
      window.location.href = "/listings";
    } finally {
      setLoading(null);
    }
  }

  async function signOut() {
    setMsg("");
    setLoading("signout");

    try {
      await supabase.auth.signOut();
      setMsg("Kijelentkezve.");
      toast.success("Kijelentkeztél.");
    } finally {
      setLoading(null);
    }
  }

  const disabled = loading !== null;

  return (
    <div className="mx-auto max-w-md">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">
            {step === "auth" ? "Belépés / Regisztráció" : "SMS ellenőrzés"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === "auth"
              ? "Jelentkezz be, vagy hozz létre új fiókot a licitáláshoz."
              : "Add meg a telefonodra kapott ellenőrző kódot."}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === "auth" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teljes név</label>
                <Input
                  placeholder="Pl. Fodor Máté"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Telefonszám</label>
                <Input
                  placeholder="+36301234567 vagy 06301234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
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
                <label className="text-sm font-medium">Jelszó</label>
                <Input
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  onClick={signIn}
                  disabled={disabled || !email.trim() || password.length < 6}
                >
                  {loading === "signin" ? "Beléptetés..." : "Belépés"}
                </Button>

                <Button
                  variant="outline"
                  onClick={signUp}
                  disabled={
                    disabled ||
                    !fullName.trim() ||
                    !email.trim() ||
                    !phone.trim() ||
                    password.length < 6
                  }
                >
                  {loading === "signup" ? "Regisztráció..." : "Regisztráció"}
                </Button>
              </div>

              <Button variant="secondary" onClick={signOut} disabled={disabled}>
                {loading === "signout" ? "Kijelentkezés..." : "Kijelentkezés"}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
                Telefonszám: <span className="font-medium text-foreground">{pendingPhone}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">SMS kód</label>
                <Input
                  placeholder="Írd be a kapott kódot"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={verifySms} disabled={disabled || !smsCode.trim()}>
                  {loading === "verify" ? "Ellenőrzés..." : "Kód ellenőrzése"}
                </Button>

                <Button variant="outline" onClick={resendSms} disabled={disabled}>
                  {loading === "resend" ? "Újraküldés..." : "Kód újraküldése"}
                </Button>
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  setStep("auth");
                  setSmsCode("");
                  setMsg("");
                }}
                disabled={disabled}
              >
                Vissza
              </Button>
            </>
          )}

          {msg && (
            <div className="rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
              {msg}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Linkek:{" "}
            <a className="underline" href="/listings">
              Aukciók
            </a>{" "}
            ·{" "}
            <a className="underline" href="/create-listing">
              Eladás
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}