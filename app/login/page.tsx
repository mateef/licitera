"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AuthMode = "login" | "register";
type Step = "auth" | "verify";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<Step>("auth");

  const [hasSession, setHasSession] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState<
    "signin" | "signup" | "verify" | "resend" | "signout" | null
  >(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session?.user?.id);
    }

    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  function isValidEmail(value: string) {
    return /\S+@\S+\.\S+/.test(value);
  }

  function isLikelyHungarianPhone(value: string) {
    const raw = value
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/\(/g, "")
      .replace(/\)/g, "");
    return /^\+36\d{9}$/.test(raw) || /^06\d{9}$/.test(raw) || /^36\d{9}$/.test(raw);
  }

  function isStrongEnoughPassword(value: string) {
    const hasMinLength = value.length >= 8;
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);

    return hasMinLength && hasLower && hasUpper && hasNumber;
  }

  async function signUp() {
    setMsg("");

    if (!fullName.trim()) {
      setMsg("Add meg a teljes neved.");
      toast.error("Add meg a teljes neved.");
      return;
    }

    if (!isLikelyHungarianPhone(phone.trim())) {
      setMsg("Adj meg érvényes telefonszámot. Példa: +36301234567");
      toast.error("Adj meg érvényes telefonszámot.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setMsg("Adj meg érvényes e-mail címet.");
      toast.error("Adj meg érvényes e-mail címet.");
      return;
    }

    if (!isStrongEnoughPassword(password)) {
      setMsg("A jelszó legyen legalább 8 karakter, tartalmazzon kisbetűt, nagybetűt és számot.");
      toast.error("A jelszó nem elég erős.");
      return;
    }

    if (password !== passwordAgain) {
      setMsg("A két jelszó nem egyezik.");
      toast.error("A két jelszó nem egyezik.");
      return;
    }

    setLoading("signup");

    try {
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
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
      setMsg("SMS kód elküldve. Add meg a telefonodra kapott kódot.");
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
      setMode("login");
      setSmsCode("");
      setIdentifier(email.trim().toLowerCase());
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
      const value = identifier.trim();

      if (!isValidEmail(value)) {
        setMsg("Belépéshez jelenleg e-mail címet adj meg.");
        toast.error("Belépéshez jelenleg e-mail címet adj meg.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: value.toLowerCase(),
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
      setHasSession(false);
    } finally {
      setLoading(null);
    }
  }

  const disabled = loading !== null;

  return (
    <div className="mx-auto max-w-xl">
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          {step === "auth" && (
            <div className="grid grid-cols-2 rounded-xl border p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMsg("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Belépés
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setMsg("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "register"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Regisztráció
              </button>
            </div>
          )}

          <div>
            <CardTitle className="text-2xl">
              {step === "verify"
                ? "SMS ellenőrzés"
                : mode === "login"
                ? "Belépés"
                : "Regisztráció"}
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              {step === "verify"
                ? "Add meg a telefonodra kapott ellenőrző kódot."
                : mode === "login"
                ? "Jelentkezz be e-mail címmel és jelszóval."
                : "Hozz létre új fiókot a licitáláshoz."}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === "verify" ? (
            <>
              <div className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
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
                  setMsg("");
                  setSmsCode("");
                }}
                disabled={disabled}
              >
                Vissza
              </Button>
            </>
          ) : mode === "login" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  placeholder="pelda@email.hu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                  autoComplete="current-password"
                />
              </div>

              <Button
                className="w-full"
                onClick={signIn}
                disabled={disabled || !identifier.trim() || password.length < 8}
              >
                {loading === "signin" ? "Beléptetés..." : "Belépés"}
              </Button>

              {!hasSession ? (
                <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Még nincs fiókod? Fent válts át a <span className="font-medium text-foreground">Regisztráció</span> fülre.
                </div>
              ) : (
                <Button variant="secondary" onClick={signOut} disabled={disabled}>
                  {loading === "signout" ? "Kijelentkezés..." : "Kijelentkezés"}
                </Button>
              )}
            </>
          ) : (
            <>
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
                <label className="text-sm font-medium">Telefonszám</label>
                <Input
                  placeholder="+36301234567"
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
                  placeholder="Legalább 8 karakter"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jelszó újra</label>
                <Input
                  placeholder="Írd be újra a jelszót"
                  type="password"
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="rounded-xl border bg-background/60 p-3 text-xs text-muted-foreground">
                A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt és számot.
              </div>

              <Button
                className="w-full"
                onClick={signUp}
                disabled={
                  disabled ||
                  !fullName.trim() ||
                  !phone.trim() ||
                  !email.trim() ||
                  !password ||
                  !passwordAgain
                }
              >
                {loading === "signup" ? "Regisztráció..." : "Regisztráció"}
              </Button>
            </>
          )}

          {msg && (
            <div className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
              {msg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}