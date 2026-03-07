"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState<"signin" | "signup" | "signout" | null>(null);

  async function signUp() {
    setMsg("");
    setLoading("signup");
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMsg(error.message);
        toast.error("Nem sikerült a regisztráció.");
        return;
      }
      setMsg("Sikeres regisztráció ✅ Most jelentkezz be.");
      toast.success("Sikeres regisztráció.");
    } finally {
      setLoading(null);
    }
  }

  async function signIn() {
    setMsg("");
    setLoading("signin");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message);
        toast.error("Nem sikerült a belépés.");
        return;
      }
      setMsg("Belépve ✅ Menj: /listings");
      toast.success("Sikeres belépés.");
      // opcionális: automatikus átirányítás
      // window.location.href = "/listings";
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
          <CardTitle className="text-xl">Belépés</CardTitle>
          <p className="text-sm text-muted-foreground">
            Jelentkezz be, vagy hozz létre új fiókot a licitáláshoz.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
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
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={signIn} disabled={disabled || !email.trim() || password.length < 6}>
              {loading === "signin" ? "Beléptetés..." : "Belépés"}
            </Button>

            <Button variant="outline" onClick={signUp} disabled={disabled || !email.trim() || password.length < 6}>
              {loading === "signup" ? "Regisztráció..." : "Regisztráció"}
            </Button>
          </div>

          <Button variant="secondary" onClick={signOut} disabled={disabled}>
            {loading === "signout" ? "Kijelentkezés..." : "Kijelentkezés"}
          </Button>

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