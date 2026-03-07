"use client";

import { useState } from "react";

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/landing-bg.png')" }}
    >
      {/* Sötét overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Felső sáv */}
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-3xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
            LICITERA
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowLogin((v) => !v)}
          className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 transition"
        >
          Bejelentkezés
        </button>
      </div>

      {/* Login panel */}
      {showLogin && (
        <div className="relative z-10 mx-auto mt-2 flex max-w-7xl justify-end px-6">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/35 p-5 text-white shadow-2xl backdrop-blur-md">
            <h2 className="mb-4 text-lg font-semibold">Belépés</h2>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-white/80">Felhasználónév</label>
                <input
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/50"
                  placeholder="Felhasználónév"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/80">Jelszó</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/50"
                  placeholder="Jelszó"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Belépés..." : "Belépés"}
              </button>

              {msg && <p className="text-sm text-red-300">{msg}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Középső hero */}
      <div className="relative z-10 flex min-h-[80vh] items-center justify-center px-6 text-center">
        <div className="max-w-4xl">
          <div className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
            A licitálás új korszaka
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-7xl">
            Fejlesztés alatt
          </h1>

          <p className="mt-6 text-xl font-medium text-white/90 sm:text-3xl">
            Hamarosan indul
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            A Licitera hamarosan élesben is elindul. Addig a platform jelenleg zárt tesztelés alatt áll.
          </p>
        </div>
      </div>
    </main>
  );
}