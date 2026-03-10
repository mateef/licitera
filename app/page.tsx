"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState("");
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    const launchDate = new Date("2026-04-01T12:00:00");

    function updateTimeLeft() {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      if (distance <= 0) {
        setTimeLeft("Indult!");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);

      setTimeLeft(`${days} nap ${hours} óra ${minutes} perc`);
    }

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 60_000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadWaitlistCount() {
      try {
        const res = await fetch("/api/waitlist-count");
        const data = await res.json().catch(() => null);

        if (res.ok) {
          setWaitlistCount(data?.count ?? 0);
        }
      } catch {
        // csendben maradunk
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
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

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

        if (!data?.message?.includes("már fel van iratkozva")) {
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
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/landing-bg.png')" }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/70" />

      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-3xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
            LICITERA
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowLogin(true)}
          className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
        >
          Bejelentkezés
        </button>
      </div>

      <section className="relative z-10 flex min-h-[78vh] items-center justify-center px-6 py-10 text-center">
        <div className="w-full max-w-5xl rounded-[32px] border border-white/15 bg-black/35 px-6 py-10 shadow-2xl backdrop-blur-md sm:px-10 sm:py-14">
          <div className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
            A licitálás új korszaka
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-7xl">
            Fejlesztés alatt
          </h1>

          <p className="mt-6 text-xl font-medium text-white/90 sm:text-3xl">
            Indulás:
          </p>

          <div className="mt-3 text-3xl font-bold text-white sm:text-5xl">{timeLeft}</div>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
            A Licitera hamarosan élesben is elindul. Addig a platform jelenleg zárt tesztelés alatt áll.
          </p>

          {waitlistCount !== null && (
            <div className="mx-auto mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
              Már {waitlistCount} érdeklődő várja az indulást
            </div>
          )}

          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/20 bg-white/12 p-4 shadow-xl backdrop-blur-md sm:p-5">
            <p className="mb-3 text-sm font-medium text-white/90">
              Kérj értesítést az indulásról
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                placeholder="Email címed az indulásról értesítéshez"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-500"
              />

              <button
                onClick={handleWaitlistSignup}
                disabled={emailLoading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-fuchsia-500 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {emailLoading ? "Küldés..." : "Értesítést kérek"}
              </button>
            </div>

            {emailMsg && <p className="mt-3 text-sm text-white">{emailMsg}</p>}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 text-center text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/15 bg-black/30 p-8 backdrop-blur-md">
          <h2 className="mb-10 text-3xl font-bold">Hogyan működik?</h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 text-4xl">📦</div>
              <h3 className="mb-2 font-semibold">Tedd fel</h3>
              <p className="text-sm opacity-85">
                Töltsd fel a terméked és indíts aukciót.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 text-4xl">🔥</div>
              <h3 className="mb-2 font-semibold">Licitek</h3>
              <p className="text-sm opacity-85">
                A vevők egymásra licitálnak.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-3 text-4xl">🏆</div>
              <h3 className="mb-2 font-semibold">Nyertes</h3>
              <p className="text-sm opacity-85">
                A legmagasabb licit nyer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLogin(false)}
          />

          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-[#0f1020]/85 p-6 text-white shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
            >
              ✕
            </button>

            <div className="mb-5">
              <div className="text-2xl font-bold">Bejelentkezés</div>
              <p className="mt-1 text-sm text-white/65">
                A zárt tesztverzió jelenleg csak admin hozzáféréssel érhető el.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-white/80">Felhasználónév</label>
                <input
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                  placeholder="Felhasználónév"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/80">Jelszó</label>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                  placeholder="Jelszó"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Belépés..." : "Belépés"}
              </button>

              {msg && <p className="text-sm text-red-300">{msg}</p>}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}