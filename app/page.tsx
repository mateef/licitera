"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BellRing,
  Brain,
  Camera,
  ChevronRight,
  Gavel,
  LayoutDashboard,
  Lock,
  Mail,
  MapPinned,
  MessageSquareMore,
  Search,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-segített feladás",
    text: "Fotó alapján cím-, leírás- és kategóriajavaslat, hogy a hirdetés ne űrlapkitöltés legyen, hanem gyors indulás.",
  },
  {
    icon: BellRing,
    title: "Valós idejű licitélmény",
    text: "Azonnali visszajelzések, túllicitálási értesítések és sokkal tisztább aukciós ritmus.",
  },
  {
    icon: Smartphone,
    title: "Mobilra tervezett UX",
    text: "Gyors, modern, tiszta felület, ami nem csak működik telefonon, hanem arra lett optimalizálva.",
  },
  {
    icon: ShieldCheck,
    title: "Bizalom és hitelesítés",
    text: "Telefonos hitelesítés, értékelések és átláthatóbb profilélmény a nyugodtabb használathoz.",
  },
  {
    icon: MessageSquareMore,
    title: "Belső chat",
    text: "Sikeres aukció után egyszerűbb egyeztetés a platformon belül, fölösleges körök nélkül.",
  },
  {
    icon: LayoutDashboard,
    title: "Átlátható dashboard",
    text: "Aktív aukciók, megnyert tételek, értesítések és account állapot egy helyen.",
  },
];

const FLOW = [
  {
    index: "01",
    icon: Camera,
    title: "Fotózd le",
    text: "Indulj egy képpel, ne egy hosszú űrlappal.",
  },
  {
    index: "02",
    icon: SearchCheck,
    title: "Add fel gyorsan",
    text: "Az AI segít struktúrálni a hirdetést és lerövidíti a feladási időt.",
  },
  {
    index: "03",
    icon: Zap,
    title: "Licitálj élőben",
    text: "Tisztán követhető licitfolyamat valós idejű visszajelzésekkel.",
  },
  {
    index: "04",
    icon: Trophy,
    title: "Zárd le egyszerűbben",
    text: "Nyertes aukció, értesítés és kapcsolatfelvétel rendezettebb módon.",
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 shadow-sm backdrop-blur-xl">
      <span className="h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_18px_rgba(217,70,239,0.65)]" />
      {children}
    </div>
  );
}

function Glass({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/72 shadow-[0_24px_80px_rgba(99,102,241,0.08)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function CounterCard({
  value,
  label,
  glow,
}: {
  value: string;
  label: string;
  glow: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white/85 p-4 shadow-sm sm:p-5">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${glow}`} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-200/50 blur-3xl transition duration-500 group-hover:scale-125" />
      <div className="relative text-[10px] uppercase tracking-[0.26em] text-slate-400">{label}</div>
      <div className="relative mt-3 text-4xl font-black tracking-[-0.08em] text-slate-900 sm:text-5xl">
        {value}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showPreviewZoom, setShowPreviewZoom] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  const launchDate = useMemo(() => new Date("2026-04-12T15:00:00"), []);
  const [timeParts, setTimeParts] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    percent: 0,
    isLive: false,
  });

  useEffect(() => {
    const start = new Date("2025-07-01T00:00:00").getTime();

    function updateTimeLeft() {
      const now = new Date().getTime();
      const end = launchDate.getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeParts({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          percent: 100,
          isLive: true,
        });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);
      const seconds = Math.floor((distance / 1000) % 60);
      const percent = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

      setTimeParts({ days, hours, minutes, seconds, percent, isLive: false });
    }

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [launchDate]);

  useEffect(() => {
    async function loadWaitlistCount() {
      try {
        const res = await fetch("/api/waitlist-count");
        const data = await res.json().catch(() => null);

        if (res.ok) {
          setWaitlistCount(data?.count ?? 0);
        }
      } catch {
        // no-op
      }
    }

    loadWaitlistCount();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/prelaunch-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || "Sikertelen bejelentkezés.");
        return;
      }

      window.location.href = "/listings";
    } catch {
      setMsg("Váratlan hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWaitlistSignup() {
    setEmailMsg("");

    if (!email.trim()) {
      setEmailMsg("Adj meg egy email címet.");
      return;
    }

    setEmailLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setEmailMsg(data?.message || "Sikeres feliratkozás.");
        setEmail("");

        if (!data?.message?.includes("már fel")) {
          setWaitlistCount((prev) => (prev ?? 0) + 1);
        }
      } else {
        setEmailMsg(data?.error || "Hiba történt a feliratkozásnál.");
      }
    } catch {
      setEmailMsg("Hiba történt a feliratkozásnál.");
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden text-slate-900">
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(59,130,246,0.14),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(168,85,247,0.12),transparent_22%),radial-gradient(circle_at_50%_72%,rgba(236,72,153,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_38%,#f8f7ff_100%)]" />

        <div className="absolute left-[7%] top-[12%] h-2 w-2 animate-pulse rounded-full bg-indigo-400/80" />
        <div className="absolute right-[10%] top-[22%] h-3 w-3 animate-pulse rounded-full bg-fuchsia-400/70" />
        <div className="absolute bottom-[16%] left-[12%] h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400/70" />

        <header className="relative z-20 mx-auto flex w-full max-w-[1580px] items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-[0_18px_40px_rgba(59,130,246,0.12)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100/90 via-indigo-100/50 to-fuchsia-100/70" />
              <Image
                src="/icon.png"
                alt="Licitera"
                width={28}
                height={28}
                className="relative"
              />
            </div>

            <div>
              <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                  LICITERA
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                A licitálás új korszaka
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white sm:px-5"
          >
            Belépés
          </button>
        </header>

        <section className="relative z-10 mx-auto w-full max-w-[1580px] px-4 pb-20 pt-4 sm:px-6 lg:px-10 lg:pb-28 lg:pt-8">
          <div className="grid gap-12 xl:grid-cols-[minmax(0,1.02fr)_minmax(540px,0.98fr)] xl:items-center">
            <div className="max-w-4xl">
              <div className="animate-[fadeIn_700ms_ease-out]">
                <Label>Zárt tesztelés · Limitált indulás</Label>
              </div>

              <div className="mt-6 animate-[slideUp_850ms_ease-out] overflow-visible pb-4">
                <h1 className="text-5xl font-black leading-[1.06] tracking-[-0.07em] text-slate-900 sm:text-6xl lg:text-7xl xl:text-[6.5rem]">
                  A licitálás
                  <span className="block bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                    új korszaka
                  </span>
                  <span className="block text-slate-800">megérkezett</span>
                </h1>
              </div>

              <div className="mt-6 animate-[slideUp_1050ms_ease-out]">
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg xl:text-[1.16rem] xl:leading-8">
                  A Licitera egy új generációs magyar aukciós piactér: AI-segített hirdetésfeladás,
                  valós idejű licitek, villámár, 1–72 órás lejárat és egy olyan mobilos UX, ami végre
                  nem fárasztó.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-4 animate-[slideUp_1200ms_ease-out] sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("waitlist")?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(99,102,241,0.28)] transition hover:-translate-y-0.5 hover:scale-[1.01]"
                >
                  Értesítést kérek
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewZoom(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white"
                >
                  Nagyított előnézet
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-10 animate-[slideUp_1350ms_ease-out]">
                <Glass className="p-4 sm:p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.26em] text-slate-400">
                        Indulásig hátralévő idő
                      </div>
                      <div className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        Már nem csak készül. Már rajtra hangolva várja az indulást.
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      {timeParts.isLive ? "Elindult" : "Készen áll a rajtra"}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <CounterCard
                      value={timeParts.isLive ? "00" : String(timeParts.days).padStart(2, "0")}
                      label="nap"
                      glow="bg-gradient-to-r from-sky-400 to-blue-500"
                    />
                    <CounterCard
                      value={timeParts.isLive ? "00" : String(timeParts.hours).padStart(2, "0")}
                      label="óra"
                      glow="bg-gradient-to-r from-indigo-400 to-violet-500"
                    />
                    <CounterCard
                      value={timeParts.isLive ? "00" : String(timeParts.minutes).padStart(2, "0")}
                      label="perc"
                      glow="bg-gradient-to-r from-fuchsia-400 to-pink-500"
                    />
                    <CounterCard
                      value={timeParts.isLive ? "00" : String(timeParts.seconds).padStart(2, "0")}
                      label="másodperc"
                      glow="bg-gradient-to-r from-cyan-400 to-sky-500"
                    />
                  </div>

                  <div className="mt-5 rounded-[1.35rem] border border-slate-200 bg-slate-50/90 p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      <span>Indulási progress</span>
                      <span>{Math.round(timeParts.percent)}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#60a5fa_0%,#818cf8_45%,#e879f9_100%)] shadow-[0_0_28px_rgba(129,140,248,0.45)] transition-all duration-1000"
                        style={{ width: `${timeParts.percent}%` }}
                      />
                    </div>
                  </div>
                </Glass>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[760px] animate-[slideUp_1100ms_ease-out] xl:ml-auto">
              <div className="absolute -inset-10 rounded-[3rem] bg-[radial-gradient(circle,rgba(99,102,241,0.18),transparent_58%)] blur-3xl" />

              <Glass className="relative p-0">
                <div className="border-b border-slate-200/80 bg-white/70 px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.55)]" />
                      App preview
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPreviewZoom(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
                    >
                      Nagyítás
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_100%)] p-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-4 shadow-[0_25px_90px_rgba(99,102,241,0.08)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.12),transparent_24%)]" />

                    <div className="relative">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                        Mobil főképernyő
                      </div>
                      <div className="mt-2 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                        A Licitera
                        <span className="block bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                          tényleg jól néz ki használat közben is
                        </span>
                      </div>

                      <div className="mt-5 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white p-2">
                        <img
                          src="/landing-preview-main.png"
                          alt="Licitera app előnézet"
                          className="block w-full rounded-[1.35rem] object-cover"
                        />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          { icon: MapPinned, label: "Helyalapú keresés" },
                          { icon: Gavel, label: "Élő licit" },
                          { icon: Mail, label: "Gyors kapcsolat" },
                        ].map((item, index) => {
                          const Icon = item.icon;

                          return (
                            <div
                              key={index}
                              className="rounded-[1.25rem] border border-slate-200 bg-white/90 p-3"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="mt-3 text-xs font-semibold leading-5 text-slate-700 sm:text-sm">
                                {item.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 backdrop-blur-2xl">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <Brain className="h-4 w-4" />
                        AI feladás
                      </div>

                      <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-2">
                        <img
                          src="/landing-preview-ai.png"
                          alt="AI hirdetésfeladás előnézet"
                          className="block w-full rounded-[1.1rem] object-cover"
                        />
                      </div>

                      <div className="mt-3 text-sm leading-6 text-slate-600">
                        Kép alapján gyorsabb cím-, leírás- és kategóriajavaslat, hogy a feladás ne
                        legyen hosszú folyamat.
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 backdrop-blur-2xl">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <BellRing className="h-4 w-4" />
                        Chat és értesítések
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-2">
                          <img
                            src="/landing-preview-chat.png"
                            alt="Belső chat előnézet"
                            className="block w-full rounded-[1.1rem] object-cover"
                          />
                        </div>

                        <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/90 p-4">
                          <div className="text-sm font-semibold text-slate-900">Nem csak látványosabb</div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">
                            A cél a gyorsabb feladás, az érthetőbb licitfolyamat és a letisztult
                            mobilos élmény.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Glass>
            </div>
          </div>
        </section>

        <section id="waitlist" className="relative z-10 px-4 pb-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1580px]">
            <Glass className="p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
                <div>
                  <Label>Korai hozzáférés</Label>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl lg:text-5xl">
                    Kérj értesítést még az indulás előtt
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                    Ha elsőként akarod látni a platform nyitását, a mobilapp indulását és a korai
                    frissítéseket, csatlakozz a várólistához.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {["Web + mobil", "AI-alapú feladás", "Automatikus licit", "Villámár + 72 óra"].map(
                      (item) => (
                        <div
                          key={item}
                          className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-700"
                        >
                          {item}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Várólista</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Add meg az emailed, és szólunk, amikor megnyílik a Licitera.
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <Lock className="h-3.5 w-3.5" />
                      Limitált indulás
                    </div>
                  </div>

                  {waitlistCount !== null ? (
                    <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                        Érdeklődők
                      </div>
                      <div className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-900">
                        {waitlistCount}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        feliratkozó várja az indulást
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        placeholder="Email címed"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      onClick={handleWaitlistSignup}
                      disabled={emailLoading}
                      className="h-13 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 px-6 font-semibold text-white shadow-[0_14px_35px_rgba(99,102,241,0.24)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-60"
                    >
                      {emailLoading ? "Küldés..." : "Feliratkozom"}
                    </button>
                  </div>

                  {emailMsg ? <p className="mt-3 text-sm text-slate-700">{emailMsg}</p> : null}
                </div>
              </div>
            </Glass>
          </div>
        </section>

        <section className="relative z-10 px-4 pb-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1580px]">
            <div className="max-w-3xl">
              <Label>Miért más?</Label>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl lg:text-5xl">
                Nem csak látványosabb. Sokkal használhatóbb is.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                A fókusz a sebességen, a mobilos élményen és az átlátható aukciós logikán van.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group relative overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)]"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-200/45 blur-3xl transition duration-500 group-hover:scale-125" />
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 text-lg font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-4 pb-24 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1580px]">
            <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr] xl:items-start">
              <div>
                <Label>Feladástól a nyerésig</Label>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl lg:text-5xl">
                  Egy flow, amit tényleg jó végigvinni
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                  A cél egy olyan aukciós élmény, ami gyorsabb, tisztább és élvezhetőbb, mint amit a
                  régi piactereknél megszoktál.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FLOW.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="group rounded-[1.85rem] border border-slate-200 bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                          {item.index}
                        </div>
                      </div>

                      <div className="mt-5 text-xl font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.text}</div>
                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-700">
                        Következő lépés
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-6 sm:pt-10">
            <div
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-md"
              onClick={() => setShowLogin(false)}
            />

            <div className="relative z-10 mb-6 w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/95 p-6 text-slate-900 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="absolute right-4 top-4 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                ✕
              </button>

              <div className="mb-6">
                <div className="text-2xl font-bold">Bejelentkezés</div>
                <p className="mt-1 text-sm text-slate-500">
                  A zárt tesztverzió jelenleg csak admin hozzáféréssel érhető el.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-slate-600">Felhasználónév</label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Felhasználónév"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-slate-600">Jelszó</label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Jelszó"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.24)] transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Belépés..." : "Belépés"}
                </button>

                {msg && <p className="text-sm text-red-500">{msg}</p>}
              </form>
            </div>
          </div>
        )}

        {showPreviewZoom && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/70 p-3 backdrop-blur-md sm:p-6">
            <button
              type="button"
              onClick={() => setShowPreviewZoom(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobilos előnézet / nagyítás
                </div>
                <div className="hidden text-slate-400 sm:block">
                  Telefonon csippentéssel is nagyítható
                </div>
              </div>

              <div
                className="max-h-[85vh] overflow-auto bg-[#eef4ff]"
                style={{ touchAction: "pan-x pan-y pinch-zoom" }}
              >
                <img
                  src="/landing-preview-zoom.png"
                  alt="Licitera előnézet nagyítva"
                  className="block w-full object-contain object-top"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}