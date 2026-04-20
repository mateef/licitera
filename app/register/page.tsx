"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

type Step = "auth" | "verify";

type CountryOption = {
  code: string;
  flag: string;
  dialCode: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "HU", flag: "🇭🇺", dialCode: "+36", placeholder: "301234567", minLength: 9, maxLength: 9 },
  { code: "RO", flag: "🇷🇴", dialCode: "+40", placeholder: "712345678", minLength: 9, maxLength: 9 },
  { code: "SK", flag: "🇸🇰", dialCode: "+421", placeholder: "912345678", minLength: 9, maxLength: 9 },
  { code: "SI", flag: "🇸🇮", dialCode: "+386", placeholder: "40123456", minLength: 8, maxLength: 9 },
  { code: "HR", flag: "🇭🇷", dialCode: "+385", placeholder: "912345678", minLength: 8, maxLength: 9 },
  { code: "CZ", flag: "🇨🇿", dialCode: "+420", placeholder: "601123456", minLength: 9, maxLength: 9 },
  { code: "DE", flag: "🇩🇪", dialCode: "+49", placeholder: "15123456789", minLength: 10, maxLength: 12 },
  { code: "AT", flag: "🇦🇹", dialCode: "+43", placeholder: "6641234567", minLength: 10, maxLength: 13 },
  { code: "RS", flag: "🇷🇸", dialCode: "+381", placeholder: "601234567", minLength: 8, maxLength: 9 },
  { code: "UA", flag: "🇺🇦", dialCode: "+380", placeholder: "501234567", minLength: 9, maxLength: 9 },
  { code: "GB", flag: "🇬🇧", dialCode: "+44", placeholder: "7123456789", minLength: 10, maxLength: 10 },
];

function normalizeLocalPhone(value: string) {
  let raw = value.replace(/[^\d]/g, "");
  if (raw.startsWith("00")) raw = raw.slice(2);
  if (raw.startsWith("0")) raw = raw.slice(1);
  return raw;
}

function buildFullPhone(dialCode: string, localPhone: string) {
  return `${dialCode}${normalizeLocalPhone(localPhone)}`;
}

function isValidPhoneForCountry(country: CountryOption, localPhone: string) {
  const normalized = normalizeLocalPhone(localPhone);
  return (
    normalized.length >= country.minLength &&
    normalized.length <= country.maxLength &&
    /^\d+$/.test(normalized)
  );
}

function CheckboxRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
    >
      <div
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          checked
            ? "border-primary bg-primary text-white"
            : "border-slate-300 bg-white text-transparent",
        ].join(" ")}
      >
        <Check className="h-3.5 w-3.5" />
      </div>
      <div className="text-sm leading-6 text-slate-700">{children}</div>
    </button>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("auth");

  const [fullName, setFullName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [smsCode, setSmsCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");

  const [acceptedAdult, setAcceptedAdult] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState<"signup" | "verify" | "resend" | null>(null);

  const fullPhonePreview = useMemo(() => {
    const normalized = normalizeLocalPhone(phoneLocal);
    if (!normalized) return `${selectedCountry.flag} ${selectedCountry.dialCode}`;
    return `${selectedCountry.flag} ${buildFullPhone(selectedCountry.dialCode, normalized)}`;
  }, [phoneLocal, selectedCountry]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim().toUpperCase() ?? "";

    if (ref) {
      setReferralCode(ref);
    }
  }, []);

  function isValidEmail(value: string) {
    return /\S+@\S+\.\S+/.test(value);
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

    if (!isValidPhoneForCountry(selectedCountry, phoneLocal.trim())) {
      const text = `Adj meg érvényes telefonszámot. Példa: ${selectedCountry.dialCode} ${selectedCountry.placeholder}`;
      setMsg(text);
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

    if (!acceptedAdult) {
      setMsg("A regisztrációhoz nyilatkoznod kell arról, hogy elmúltál 18 éves.");
      toast.error("Jelöld be a 18 év feletti nyilatkozatot.");
      return;
    }

    if (!acceptedTerms) {
      setMsg("A regisztrációhoz el kell fogadnod az ÁSZF-et.");
      toast.error("Fogadd el az ÁSZF-et.");
      return;
    }

    if (!acceptedPrivacy) {
      setMsg("A regisztrációhoz tudomásul kell venned az Adatkezelési tájékoztatót.");
      toast.error("Fogadd el az adatkezelési tájékoztatót.");
      return;
    }

    const normalizedReferralCode = referralCode.trim().toUpperCase();

    setLoading("signup");

    try {
      if (normalizedReferralCode) {
        const {
          data: referralIsValid,
          error: referralValidateError,
        } = await supabase.rpc("validate_referral_code", {
          p_code: normalizedReferralCode,
        });

        if (referralValidateError) {
          setMsg(referralValidateError.message);
          toast.error("Nem sikerült ellenőrizni a meghívókódot.");
          return;
        }

        if (!referralIsValid) {
          setMsg("A megadott meghívókód érvénytelen.");
          toast.error("Érvénytelen meghívókód.");
          return;
        }
      }

      await supabase.auth.signOut();

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = buildFullPhone(selectedCountry.dialCode, phoneLocal.trim());

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
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
          phone: normalizedPhone,
          email: normalizedEmail,
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

      if (normalizedReferralCode) {
        const { error: claimReferralError } = await supabase.rpc("claim_referral_code", {
          p_invited_user_id: userId,
          p_code: normalizedReferralCode,
        });

        if (claimReferralError) {
          setMsg(claimReferralError.message);
          toast.error("Nem sikerült rögzíteni a meghívókódot.");
          return;
        }
      }

      const smsRes = await fetch("/api/send-verification-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
        }),
      });

      const smsData = await smsRes.json().catch(() => null);

      if (!smsRes.ok) {
        setMsg(smsData?.error || "Nem sikerült elküldeni az SMS kódot.");
        toast.error("Nem sikerült elküldeni az SMS kódot.");
        return;
      }

      setPendingUserId(userId);
      setPendingPhone(normalizedPhone);
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
      setMsg("Hiányzik a felhasználóazonosító.");
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
      window.location.href = "/login";
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

  const disabled = loading !== null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.9),rgba(255,255,255,0.98),rgba(245,208,254,0.7))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Sparkles className="h-3.5 w-3.5" />
              Licitera fiók
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Regisztrálj és
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                kezdd el a licitálást
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              A Licitera használatához nem kötelező azonnal fiókot létrehoznod, de regisztráció
              után licitálhatsz, menthetsz, kommentelhetsz, vásárolhatsz és meghívókódot is
              használhatsz.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6">
                <a href="/listings">
                  Aukciók böngészése
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="outline"
                asChild
                className="rounded-full border-slate-200 bg-white/80 px-6"
              >
                <a href="/login">Van már fiókom</a>
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/75 p-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="mt-3 font-semibold text-slate-900">Biztonságosabb piactér</div>
                <div className="mt-1 text-sm text-slate-600">
                  Telefonszám-hitelesítéssel csökkentett visszaélések.
                </div>
              </div>

              <div className="rounded-2xl bg-white/75 p-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div className="mt-3 font-semibold text-slate-900">Gyors regisztráció</div>
                <div className="mt-1 text-sm text-slate-600">
                  Néhány adat, SMS ellenőrzés, és már kész is.
                </div>
              </div>

              <div className="rounded-2xl bg-white/75 p-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="mt-3 font-semibold text-slate-900">Meghívókód használat</div>
                <div className="mt-1 text-sm text-slate-600">
                  Ismerősöd kódját már regisztrációkor megadhatod.
                </div>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <CardHeader className="space-y-4 pb-4">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
                  {step === "verify" ? "SMS ellenőrzés" : "Új fiók létrehozása"}
                </CardTitle>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step === "verify"
                    ? "Írd be a telefonodra kapott ellenőrző kódot."
                    : "Add meg az adataidat, majd erősítsd meg a telefonszámodat SMS-ben."}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {step === "verify" ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Telefonszám:
                    <span className="ml-2 font-semibold text-slate-900">{pendingPhone}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">SMS kód</label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Írd be a kapott kódot"
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="h-12 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      onClick={verifySms}
                      disabled={disabled || !smsCode.trim()}
                      className="rounded-2xl"
                    >
                      {loading === "verify" ? "Ellenőrzés..." : "Kód ellenőrzése"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={resendSms}
                      disabled={disabled}
                      className="rounded-2xl"
                    >
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
                    className="w-full rounded-2xl"
                  >
                    Vissza
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Teljes név</label>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Pl. Kiss Péter"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        className="h-12 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Telefonszám</label>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const next = COUNTRY_OPTIONS.find((item) => item.code === e.target.value);
                          if (next) setSelectedCountry(next);
                        }}
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.dialCode}
                          </option>
                        ))}
                      </select>

                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder={selectedCountry.placeholder}
                          value={phoneLocal}
                          onChange={(e) => setPhoneLocal(e.target.value)}
                          inputMode="tel"
                          autoComplete="tel"
                          className="h-12 rounded-2xl border-slate-200 pl-11"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                      Ellenőrzésre küldött szám:{" "}
                      <span className="font-semibold text-slate-900">{fullPhonePreview}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Meghívókód <span className="text-slate-400">(opcionális)</span>
                    </label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Pl. LIC586E3A05"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="h-12 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      Ha egy ismerősöd hívott meg, add meg itt a kódját.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">E-mail cím</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="pelda@email.hu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        inputMode="email"
                        autoComplete="email"
                        className="h-12 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Jelszó</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Minimum 8 karakter"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        className="h-12 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Jelszó újra</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Írd be újra a jelszót"
                        type="password"
                        value={passwordAgain}
                        onChange={(e) => setPasswordAgain(e.target.value)}
                        autoComplete="new-password"
                        className="h-12 rounded-2xl border-slate-200 pl-11"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                    A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell
                    kisbetűt, nagybetűt és számot.
                  </div>

                  <div className="space-y-3">
                    <CheckboxRow checked={acceptedAdult} onToggle={() => setAcceptedAdult((prev) => !prev)}>
                      Elmúltam 18 éves.
                    </CheckboxRow>

                    <CheckboxRow checked={acceptedTerms} onToggle={() => setAcceptedTerms((prev) => !prev)}>
                      Elolvastam és elfogadom az{" "}
                      <a href="/legal/aszf" className="font-semibold text-primary underline">
                        ÁSZF-et
                      </a>
                      .
                    </CheckboxRow>

                    <CheckboxRow checked={acceptedPrivacy} onToggle={() => setAcceptedPrivacy((prev) => !prev)}>
                      Elolvastam és tudomásul veszem az{" "}
                      <a href="/legal/privacy" className="font-semibold text-primary underline">
                        Adatkezelési tájékoztatót
                      </a>
                      .
                    </CheckboxRow>
                  </div>

                  <Button
                    className="h-12 w-full rounded-2xl"
                    onClick={signUp}
                    disabled={
                      disabled ||
                      !fullName.trim() ||
                      !phoneLocal.trim() ||
                      !email.trim() ||
                      !password ||
                      !passwordAgain
                    }
                  >
                    {loading === "signup" ? "Regisztráció..." : "Fiók létrehozása"}
                  </Button>

                  <Button
                    variant="outline"
                    asChild
                    className="h-12 w-full rounded-2xl border-slate-200"
                  >
                    <a href="/listings">Most inkább körülnézek</a>
                  </Button>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    Van már fiókod?{" "}
                    <a href="/login" className="font-semibold text-slate-900 underline">
                      Jelentkezz be itt
                    </a>
                    .
                  </div>
                </>
              )}

              {msg && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {msg}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <ChevronRight className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">ÁSZF</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A Licitera használatának szabályai és feltételei.
            </p>
            <Button variant="outline" asChild className="mt-4 w-full rounded-2xl">
              <a href="/legal/aszf">Megnyitás</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Adatkezelés</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hogyan kezeljük az adataidat a Licitera használata során.
            </p>
            <Button variant="outline" asChild className="mt-4 w-full rounded-2xl">
              <a href="/legal/privacy">Megnyitás</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Phone className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Segítség és hibajelzés</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Elérhetőségek, segítség, hiba jelentése és fontos tudnivalók.
            </p>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" asChild className="w-full rounded-2xl">
                <a href="/help">Súgó</a>
              </Button>
              <Button variant="outline" asChild className="w-full rounded-2xl">
                <a href="/support/report-error">Hiba jelentése</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}