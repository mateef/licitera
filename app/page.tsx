"use client";

import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
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

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_45%,#f5d0fe_100%)] px-2 py-2 text-white sm:px-3 sm:py-3">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#060816] shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.2),transparent_28%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.18),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,22,0.28),rgba(6,8,22,0.8))]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:32px_32px]" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
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

        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-90px)] w-full max-w-[1600px] items-center gap-8 px-4 pb-12 pt-2 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-10 lg:pb-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-xl sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              Zárt tesztelés · Hamarosan indul
            </div>

            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl xl:text-8xl">
              A licitálás
              <span className="block bg-gradient-to-r from-blue-300 via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                új korszaka
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg xl:text-xl xl:leading-8">
              Gyorsabb, letisztultabb és sokkal élvezhetőbb piacteret építünk, mint a régi aukciós oldalak.
              A Licitera mobilon is prémium élményt ad, miközben átlátható és biztonságos marad.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Egy</div>
                <div className="mt-2 text-3xl font-extrabold text-white xl:text-4xl">
                  {timeParts.isLive ? "ÉLŐ" : timeParts.days}
                </div>
                <div className="mt-1 text-sm text-white/65">{timeParts.isLive ? "most" : "nap"}</div>
              </div>

              <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Új</div>
                <div className="mt-2 text-3xl font-extrabold text-white xl:text-4xl">
                  {timeParts.isLive ? "0" : timeParts.hours}
                </div>
                <div className="mt-1 text-sm text-white/65">óra</div>
              </div>

              <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Korszak</div>
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

            <div className="mt-8 max-w-2xl rounded-[1.75rem] border border-white/12 bg-white/[0.08] p-4 shadow-[0_20px_80px_rgba(8,10,32,0.55)] backdrop-blur-2xl sm:p-5">
              <div>
                <div className="text-sm font-semibold text-white">Kérj értesítést az indulásról</div>
                <div className="mt-1 text-sm text-white/62">
                  Elsőként tudhatod meg, amikor élesben megnyitjuk a Liciterát.
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

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="text-lg">⚡</div>
                <div className="mt-2 font-semibold text-white">Gyors és modern</div>
                <div className="mt-1 text-sm text-white/62">
                  Nem elavult piactér, hanem mai szemmel is prémium élmény.
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="text-lg">🔒</div>
                <div className="mt-2 font-semibold text-white">Biztonságos</div>
                <div className="mt-1 text-sm text-white/62">
                  Telefonszám-hitelesítés, átlátható szabályok és megbízható flow.
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="text-lg">📱</div>
                <div className="mt-2 font-semibold text-white">Mobilra tervezve</div>
                <div className="mt-1 text-sm text-white/62">
                  Telefonon is erős, gyors és jól használható felület.
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/25 via-indigo-500/10 to-fuchsia-500/25 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] p-3 shadow-[0_24px_100px_rgba(6,8,22,0.65)] backdrop-blur-2xl sm:p-4">
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Előnézet
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">Licitera</div>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                  <img
                    src="/landing-bg.png"
                    alt="Licitera előnézet"
                    className="h-[300px] w-full object-cover sm:h-[380px] xl:h-[540px]"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/40">Cél</div>
                    <div className="mt-2 text-sm text-white/72">
                      A végleges felület célja egy gyorsabb, tisztább és bizalomépítőbb aukciós élmény.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/40">Zajlik a fejlesztés</div>
                    <div className="mt-2 text-sm text-white/72">
                      Magyarország legjobb, legmodernebb, legegyszerűbben használható licit weboldala.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-4 pb-16 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1600px] rounded-[2rem] border border-white/12 bg-white/[0.06] p-6 shadow-[0_20px_80px_rgba(6,8,22,0.38)] backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/55">
                Miért lesz más?
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Letisztult, gyors és valóban modern piactér
              </h2>

              <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                Nem csak szebb UI-t építünk, hanem olyan élményt, ami gyorsabb, bizalomépítőbb és használhatóbb is,
                mint a régi aukciós oldalak.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-2xl">
                  📦
                </div>
                <h3 className="text-lg font-semibold text-white">Tedd fel</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Gyors feladás, átgondolt struktúra, jobb kategóriák és átlátható adatok.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-2xl">
                  🔥
                </div>
                <h3 className="text-lg font-semibold text-white">Licitelj</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Tiszta, gyors licitfolyamat, mobilon is kényelmes kezeléssel és erős visszajelzésekkel.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl">
                  🏆
                </div>
                <h3 className="text-lg font-semibold text-white">Nyerd meg</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Biztonságosabb kapcsolatfelvétel, hitelesített felhasználók és modern tranzakciós logika.
                </p>
              </div>
            </div>
          </div>
        </section>

        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowLogin(false)} />

            <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/15 bg-[#0b1021]/90 p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
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
      </div>
    </main>
  );
}