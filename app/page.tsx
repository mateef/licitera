"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Brain,
  Camera,
  ChevronRight,
  Gavel,
  Heart,
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
  Star,
  Trophy,
  X,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-segített hirdetésfeladás",
    text: "Fotó alapján cím-, leírás- és kategóriajavaslat, hogy gyorsabban menjen ki a hirdetés.",
  },
  {
    icon: Smartphone,
    title: "Mobilra tervezett élmény",
    text: "Gyors keresés, tiszta licitfolyamat és átlátható kezelőfelület telefonon és weben is.",
  },
  {
    icon: ShieldCheck,
    title: "Nagyobb bizalom",
    text: "Telefonos hitelesítés, értékelések és tisztább felhasználói profilok a nyugodtabb használathoz.",
  },
  {
    icon: BellRing,
    title: "Valós idejű értesítések",
    text: "Túllicitálás, lejárat, nyert aukció és fontos account események egy helyen.",
  },
  {
    icon: MessageSquareMore,
    title: "Belső chat",
    text: "Sikeres aukció után a felek egyszerűbben tudnak egyeztetni a platformon belül.",
  },
  {
    icon: LayoutDashboard,
    title: "Átlátható dashboard",
    text: "Aktív aukciók, nyert tételek, értékelések és account állapot tisztán, felesleges zaj nélkül.",
  },
];

const STEPS = [
  {
    number: "01",
    icon: Camera,
    title: "Fotózd le",
    text: "Tölts fel egy képet, és indítsd el gyorsabban a feladást.",
  },
  {
    number: "02",
    icon: SearchCheck,
    title: "Találd meg",
    text: "Keresés, szűrés és releváns találatok gyors, tiszta felületen.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Licitálj",
    text: "Könnyen követhető licitfolyamat, azonnali visszajelzésekkel.",
  },
  {
    number: "04",
    icon: Trophy,
    title: "Nyerd meg",
    text: "Értesítések, kapcsolatfelvétel és rendezettebb lezárási élmény.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
      {children}
    </div>
  );
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[1.75rem] border border-white/10 bg-white/[0.06] backdrop-blur-2xl ${className}`}>
      {children}
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

  const launchDate = useMemo(() => new Date("2026-04-10T20:00:00"), []);
  const [timeParts, setTimeParts] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    isLive: false,
  });

  useEffect(() => {
    function updateTimeLeft() {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      if (distance <= 0) {
        setTimeParts({ days: 0, hours: 0, minutes: 0, isLive: true });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);

      setTimeParts({ days, hours, minutes, isLive: false });
    }

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 30_000);
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
    <main className="min-h-screen bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_48%,#f5d0fe_100%)] px-3 py-3 text-white sm:px-4 sm:py-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#060816] shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.22),transparent_28%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.20),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,22,0.12),rgba(6,8,22,0.86))]" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_10px_30px_rgba(59,130,246,0.18)] backdrop-blur-xl">
              <span className="bg-gradient-to-br from-blue-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-xl font-black text-transparent">
                L
              </span>
            </div>

            <div>
              <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                  LICITERA
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                A licitálás új korszaka
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition hover:bg-white/15 sm:px-5"
          >
            Belépés
          </button>
        </header>

        <section className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-14 pt-4 sm:px-6 lg:px-8 lg:pb-20">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.02fr)_minmax(460px,0.98fr)] xl:items-center">
            <div className="max-w-3xl">
              <SectionLabel>Zárt tesztelés · Hamarosan indul</SectionLabel>

              <h1 className="mt-5 text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl xl:text-8xl">
                A licitálás
                <span className="block bg-gradient-to-r from-blue-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                  új korszaka
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg xl:text-xl xl:leading-8">
                Egy modern magyar aukciós piactér, ahol a hirdetésfeladás, a licitálás és a teljes
                felhasználói élmény végre gyors, tiszta és átlátható mobilon és weben is.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["Indulás", timeParts.isLive ? "ÉLŐ" : String(timeParts.days), timeParts.isLive ? "most" : "nap"],
                  ["Hátra", timeParts.isLive ? "0" : String(timeParts.hours), "óra"],
                  ["Utolsó", timeParts.isLive ? "0" : String(timeParts.minutes), "perc"],
                ].map(([label, value, unit]) => (
                  <GlassPanel key={label} className="p-4 shadow-[0_18px_60px_rgba(6,8,22,0.35)]">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</div>
                    <div className="mt-2 text-3xl font-extrabold text-white xl:text-4xl">{value}</div>
                    <div className="mt-1 text-sm text-white/65">{unit}</div>
                  </GlassPanel>
                ))}
              </div>

              {waitlistCount !== null && (
                <div className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl">
                  Már {waitlistCount} érdeklődő várja az indulást
                </div>
              )}

              <GlassPanel className="mt-8 p-5 shadow-[0_22px_70px_rgba(6,8,22,0.4)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Kérj értesítést az indulásról</div>
                    <div className="mt-1 text-sm text-white/62">
                      Elsőként tudhatod meg, amikor megnyitjuk a Liciterát.
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
                    <Lock className="h-3.5 w-3.5" />
                    Zárt indulási szakasz
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    placeholder="Email címed"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 flex-1 rounded-2xl border border-white/12 bg-white px-4 text-black outline-none placeholder:text-gray-500"
                  />

                  <button
                    onClick={handleWaitlistSignup}
                    disabled={emailLoading}
                    className="h-12 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 px-6 font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.45)] transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                  >
                    {emailLoading ? "Küldés..." : "Értesítést kérek"}
                  </button>
                </div>

                {emailMsg && <p className="mt-3 text-sm text-white/88">{emailMsg}</p>}
              </GlassPanel>
            </div>

            <div className="relative mx-auto w-full max-w-[640px] xl:ml-auto">
              <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-fuchsia-500/20 blur-3xl" />

              <GlassPanel className="relative overflow-hidden p-3 shadow-[0_24px_100px_rgba(6,8,22,0.58)] sm:p-4">
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Előnézet
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPreviewZoom(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                  >
                    Nagyítás
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#0b1020] p-3 sm:p-4">
                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] bg-gradient-to-r from-blue-500/18 via-indigo-500/16 to-fuchsia-500/16 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.16em] text-white/45">Licitera app</div>
                          <div className="mt-2 text-3xl font-black leading-tight text-white">
                            Letisztult aukciós élmény
                            <span className="block bg-gradient-to-r from-blue-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                              felesleges zaj nélkül
                            </span>
                          </div>
                        </div>

                        <div className="hidden rounded-2xl bg-black/20 px-3 py-2 text-right sm:block">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Hátra</div>
                          <div className="mt-1 text-sm font-semibold text-white">2 ó 14 p</div>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex h-12 items-center rounded-full border border-white/10 bg-white/5 px-4 pl-11 text-sm text-white/60">
                        Keress terméket, kategóriát vagy kulcsszót...
                      </div>
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
  { icon: MapPinned, label: "Helyalapú keresés" },
  { icon: Gavel, label: "Okos licitlogika" },
  { icon: Mail, label: "Automatikus értesítés" },
].map((item, index) => {
  const Icon = item.icon;

  return (
    <div key={index} className="rounded-2xl bg-white/5 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{item.label}</div>
    </div>
  );
})}
                    </div>

                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04]">
                      <div className="aspect-[16/10] bg-[linear-gradient(135deg,#1e293b,#334155,#475569)]" />
                      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                        <div>
                          <div className="text-lg font-bold text-white">Kiemelt aukció</div>
                          <div className="mt-1 text-sm leading-6 text-white/60">
                            Egyszerűen követhető hirdetésnézet, tiszta hierarchia és erős mobilos megjelenés.
                          </div>
                        </div>
                        <div className="rounded-2xl bg-black/25 px-3 py-2 text-right">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Jelenlegi licit</div>
                          <div className="mt-1 text-lg font-black text-white">112 000 Ft</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="max-w-3xl">
              <SectionLabel>Fő előnyök</SectionLabel>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Tisztábban, gyorsabban, modernebben
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                A fókusz most nem a látványos zajon van, hanem azon, hogy a rendszer érthető, gyors és
                használható legyen minden kijelzőn.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-white/65">{item.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="max-w-3xl">
              <SectionLabel>Hogyan működik?</SectionLabel>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Fotótól a nyertes licitig
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[1.65rem] border border-white/10 bg-white/[0.05] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-semibold tracking-[0.18em] text-white/35">{item.number}</div>
                    </div>

                    <div className="mt-4 text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-white/65">{item.text}</div>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/80">
                      Tovább
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-6 sm:pt-10">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowLogin(false)} />

            <div className="relative z-10 mb-6 w-full max-w-md rounded-[2rem] border border-white/15 bg-[#0b1021]/90 p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 transition hover:bg-white/10"
              >
                ✕
              </button>

              <div className="mb-6">
                <div className="text-2xl font-bold">Bejelentkezés</div>
                <p className="mt-1 text-sm text-white/60">
                  A zárt tesztverzió jelenleg csak admin hozzáféréssel érhető el.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-white/75">Felhasználónév</label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/35"
                    placeholder="Felhasználónév"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-white/75">Jelszó</label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/35"
                    placeholder="Jelszó"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? "Belépés..." : "Belépés"}
                </button>

                {msg && <p className="text-sm text-red-300">{msg}</p>}
              </form>
            </div>
          </div>
        )}

        {showPreviewZoom && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-md sm:p-6">
            <button
              type="button"
              onClick={() => setShowPreviewZoom(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1021]/80 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobilos előnézet / nagyítás
                </div>
                <div className="hidden text-white/45 sm:block">Telefonon csippentéssel is nagyítható</div>
              </div>

              <div className="max-h-[85vh] overflow-auto bg-black" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
                <img
                  src="/landing-bg.png"
                  alt="Licitera előnézet nagyítva"
                  className="w-full object-contain object-top"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
