"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function isValidEmail(value: string) {
    return /\S+@\S+\.\S+/.test(value);
  }

  async function handleSendReset() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setMsg("Adj meg érvényes e-mail címet.");
      toast.error("Adj meg érvényes e-mail címet.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: "https://licitera.hu/auth/reset-password",
      });

      if (error) {
        setMsg(error.message || "Nem sikerült elküldeni a jelszó-visszaállító e-mailt.");
        toast.error("Nem sikerült elküldeni az e-mailt.");
        return;
      }

      setMsg("Ha az e-mail cím létezik a rendszerben, hamarosan kapsz egy jelszó-visszaállító levelet.");
      toast.success("Jelszó-visszaállító e-mail elküldve.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <CardHeader>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
            Elfelejtett jelszó
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Add meg az e-mail címed, és küldünk egy jelszó-visszaállító linket.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
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

          <Button
            className="h-12 w-full rounded-2xl"
            onClick={handleSendReset}
            disabled={loading}
          >
            {loading ? "Küldés..." : "Jelszó-visszaállító e-mail küldése"}
          </Button>

          <Button variant="outline" asChild className="h-12 w-full rounded-2xl border-slate-200">
            <a href="/login">Vissza a belépéshez</a>
          </Button>

          {msg && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {msg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}