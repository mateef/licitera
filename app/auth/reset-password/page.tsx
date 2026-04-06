"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function isStrongEnoughPassword(value: string) {
    const hasMinLength = value.length >= 8;
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    return hasMinLength && hasLower && hasUpper && hasNumber;
  }

  async function handleResetPassword() {
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

    setLoading(true);
    setMsg("");

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMsg(error.message || "Nem sikerült módosítani a jelszót.");
        toast.error("Nem sikerült módosítani a jelszót.");
        return;
      }

      setMsg("A jelszó sikeresen módosítva lett.");
      toast.success("A jelszó sikeresen módosítva lett.");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <CardHeader>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
            Új jelszó beállítása
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Add meg az új jelszavad.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Új jelszó</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Új jelszó"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Új jelszó újra</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Új jelszó újra"
                type="password"
                value={passwordAgain}
                onChange={(e) => setPasswordAgain(e.target.value)}
                autoComplete="new-password"
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt, nagybetűt és számot.
          </div>

          <Button
            className="h-12 w-full rounded-2xl"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? "Mentés..." : "Új jelszó mentése"}
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