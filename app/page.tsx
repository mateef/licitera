"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Smartphone,
  Camera,
  BellRing,
  Gavel,
  Clock3,
  Star,
  CreditCard,
  ScanSearch,
  ChevronRight,
  X,
  Lock,
  Mail,
  Zap,
  Trophy,
  LayoutDashboard,
  BadgeCheck,
  ArrowRight,
  SearchCheck,
  MapPinned,
  MessageSquareMore,
} from "lucide-react";

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

  const launchDate = useMemo(() => new Date("2026-04-01T12:00:00"), []);
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
        headers: {
          "Content-Type": "application/json",
        },
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        setEmailMsg(data?.message || "Feliratkozva 🚀");
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

  const coreFeatures = [
    {
      icon: <ScanSearch className="h-5 w-5" />,
      title: "AI-alapú képfelismerés",
      text: "A hirdetésfeladás intelligensebb lesz: a rendszer segít felismerni a terméket, strukturálni az adatokat és gyorsabban kitölteni a feladási űrlapot.",
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: "Mobilra tervezett élmény",
      text: "Nem csak mobilon is működik, hanem eleve telefonra optimalizált. Gyors keresés, egyszerű licitálás, tiszta UI és átlátható értesítések.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Biztonság és hitelesítés",
      text: "SMS-ellenőrzés, átlátható értékelési rendszer, megbízhatóbb felhasználói élmény és erősebb bizalom az eladók és vevők között.",
    },
  ];

  const platformHighlights = [
    {
      icon: <MapPinned className="h-5 w-5" />,
      title: "Település + vármegye alapú böngészés",
      text: "A hirdetések helyalapon is átláthatók lesznek, gyorsabb szűréssel és relevánsabb találatokkal.",
    },
    {
      icon: <Gavel className="h-5 w-5" />,
      title: "Okos licitlogika",
      text: "Ha az utolsó percekben érkezik licit, az aukció automatikusan hosszabbodik, így tisztább és igazságosabb lesz a lezárás.",
    },
    {
      icon: <BellRing className="h-5 w-5" />,
      title: "Valós idejű értesítések",
      text: "Túllicitálás, lejárat, nyert aukció, kategóriás figyelések és fontos account események — mind letisztultan kezelve.",
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: "Automatikus kapcsolatfelvétel",
      text: "A nyertes aukció után az eladó és a vevő automatikus emailt kap a következő lépésekhez szükséges információkkal.",
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "Értékelések és profilbizalom",
      text: "1–5 csillagos értékelés, rövid visszajelzések és egy erősebb bizalmi réteg minden tranzakció után.",
    },
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: "Valódi dashboard",
      text: "Aktív aukciók, megnyert tételek, eladott termékek, figyelőlista és account állapot egy helyen.",
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: "Modern fizetési háttér",
      text: "Stripe egyenlegrendezés, számlázási logika, előfizetések és átláthatóbb pénzügyi működés.",
    },
    {
      icon: <BadgeCheck className="h-5 w-5" />,
      title: "Prémium előfizetés",
      text: "Kiemelt megjelenés, kedvezőbb működési modell és extra láthatóság azoknak, akik komolyabban használják a platformot.",
    },
  ];

  const userFlow = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "Fotózd le",
      text: "Gyorsabb feladás, intelligensebb adatkitöltés és tisztább struktúra.",
    },
    {
      icon: <SearchCheck className="h-5 w-5" />,
      title: "Találd meg",
      text: "Jobb szűrés, helyalapú keresés, figyelések és prémium mobilos UX.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Licitálj gyorsan",
      text: "Erős visszajelzés, könnyű követhetőség és igazságosabb lezárási logika.",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: "Nyerd meg biztonságosan",
      text: "Értesítések, kapcsolatfelvétel, bizalmi réteg és átlátható folyamat.",
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_48%,#f5d0fe_100%)] px-3 py-3 text-white sm:px-4 sm:py-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#060816] shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.22),transparent_28%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.20),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,22,0.20),rgba(6,8,22,0.80))]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.85)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:32px_32px]" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1680px] items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
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
                Prémium aukciós piactér
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

        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-[1680px] items-center gap-10 px-4 pb-12 pt-2 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:px-10 lg:pb-16">
          {/* LEFT */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-xl sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              Zárt tesztelés · Hamarosan indul
            </div>

            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl xl:text-8xl">
              A licitálás
              <span className="block bg-gradient-to-r from-blue-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                új korszaka
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg xl:text-xl xl:leading-8">
              A Licitera nem egy újabb régi stílusú aukciós oldal. Egy gyors, mobilra tervezett,
              modern magyar piactér, ahol a feladás, a licitálás és a teljes felhasználói élmény
              végre 2026-os szintre kerül.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Indulás</div>
                <div className="mt-2 text-3xl font-extrabold text-white xl:text-4xl">
                  {timeParts.isLive ? "ÉLŐ" : timeParts.days}
                </div>
                <div className="mt-1 text-sm text-white/65">{timeParts.isLive ? "most" : "nap"}</div>
              </div>

              <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Hátra</div>
                <div className="mt-2 text-3xl font-extrabold text-white xl:text-4xl">
                  {timeParts.isLive ? "0" : timeParts.hours}
                </div>
                <div className="mt-1 text-sm text-white/65">óra</div>
              </div>

              <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Utolsó</div>
                <div className="mt-2 text-3xl font-extrabold text-white xl:text-4xl">
                  {timeParts.isLive ? "0" : timeParts.minutes}
                </div>
                <div className="mt-1 text-sm text-white/65">perc</div>
              </div>
            </div>

            {waitlistCount !== null && (
              <div className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl">
                Már {waitlistCount} érdeklődő várja az indulást
              </div>
            )}

            <div className="mt-8 max-w-3xl rounded-[1.85rem] border border-white/12 bg-white/[0.08] p-4 shadow-[0_20px_80px_rgba(8,10,32,0.55)] backdrop-blur-2xl sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Kérj értesítést az indulásról</div>
                  <div className="mt-1 text-sm text-white/62">
                    Elsőként tudhatod meg, amikor élesben megnyitjuk a Liciterát.
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
                  <Lock className="h-3.5 w-3.5" />
                  Jelenleg zárt indulási szakasz
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
            </div>

            <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
              {coreFeatures.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    {item.icon}
                  </div>
                  <div className="mt-3 font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-white/62">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div className="relative mx-auto w-full max-w-3xl">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-500/25 via-indigo-500/10 to-fuchsia-500/25 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-white/[0.08] p-3 shadow-[0_24px_100px_rgba(6,8,22,0.65)] backdrop-blur-2xl sm:p-4">
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Előnézet
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">Licitera Preview</div>
                </div>

                <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20">
                  <img
                    src="/landing-bg.png"
                    alt="Licitera előnézet"
                    className="h-[280px] w-full object-cover object-top sm:h-[380px] lg:h-[520px] xl:h-[620px]"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,22,0)_55%,rgba(6,8,22,0.5)_100%)]" />

                  <button
                    type="button"
                    onClick={() => setShowPreviewZoom(true)}
                    className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-xl backdrop-blur-xl transition hover:bg-white/15"
                  >
                    Nagyítás
                  </button>

                  <div className="absolute left-4 top-4 flex max-w-[86%] flex-wrap gap-2">
                    <div className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                      AI-alapú feladás
                    </div>
                    <div className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                      Mobil first
                    </div>
                    <div className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                      Élő licitélmény
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/40">
                      <Zap className="h-3.5 w-3.5" />
                      Cél
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/72">
                      Magyarország legjobb, legmodernebb és legegyszerűbben használható licites weboldalát építjük.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/40">
                      <MessageSquareMore className="h-3.5 w-3.5" />
                      Indulás előtt
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/72">
                      Minden fő flow-t csiszolunk: UI, UX, mobil élmény, számlázás, értesítések, bizalom és sebesség.
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/40">Feladás</div>
                    <div className="mt-2 text-sm font-semibold text-white">AI + egyszerűsített flow</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/40">Licitálás</div>
                    <div className="mt-2 text-sm font-semibold text-white">valós idejű és tiszta</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/40">Bizalom</div>
                    <div className="mt-2 text-sm font-semibold text-white">értékelések + hitelesítés</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM HIGHLIGHTS */}
        <section className="relative z-10 px-4 pb-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1680px] rounded-[2rem] border border-white/12 bg-white/[0.06] p-6 shadow-[0_20px_80px_rgba(6,8,22,0.38)] backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/55">
                Miért lesz más?
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Nem csak szebb. Okosabb, gyorsabb és erősebb is.
              </h2>

              <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                A Licitera nem pusztán új design. A teljes piactér-logikát modernebb szemlélettel építjük újra.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {platformHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FLOW */}
        <section className="relative z-10 px-4 pb-16 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1680px]">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/55">
                Hogyan működik?
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Fotótól a nyertes licitig
              </h2>

              <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                Egy rövidebb, gyorsabb, élvezhetőbb és biztonságosabb flow, mint amit a régi piactereknél megszoktál.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {userFlow.map((item, index) => (
                <div
                  key={item.title}
                  className="relative rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-5"
                >
                  <div className="absolute right-4 top-4 text-xs font-semibold text-white/30">
                    0{index + 1}
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                    {item.icon}
                  </div>

                  <div className="mt-4 text-lg font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-white/65">{item.text}</div>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/80">
                    Tovább
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LOGIN MODAL */}
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

        {/* PREVIEW ZOOM MODAL */}
        {showPreviewZoom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6">
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
                <div className="hidden sm:block text-white/45">
                  Telefonon csippentéssel is nagyítható
                </div>
              </div>

              <div
                className="max-h-[85vh] overflow-auto bg-black"
                style={{ touchAction: "pan-x pan-y pinch-zoom" }}
              >
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