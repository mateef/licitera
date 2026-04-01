"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Shield,
  Trash2,
  Clock3,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function DeleteAccountPage() {
  const [loading, setLoading] = useState(false);

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Biztosan törölni szeretnéd a Licitera fiókodat? Ez a művelet nem vonható vissza."
    );

    if (!confirmed) return;

    const finalConfirmed = window.confirm(
      "Utolsó megerősítés: a fiókodhoz tartozó hozzáférés megszűnik, és a törlési folyamat elindul. Folytatod?"
    );

    if (!finalConfirmed) return;

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("A fiók törléséhez előbb jelentkezz be.");
        return;
      }

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || "Nem sikerült törölni a fiókot.");
        return;
      }

      await supabase.auth.signOut();
      toast.success("A fiók törlése sikeres volt.");
      window.location.href = "/login";
    } catch (e: any) {
      toast.error(e?.message || "Nem sikerült törölni a fiókot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
            <Trash2 className="h-4 w-4" />
            Licitera fióktörlés
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Fiók végleges törlése
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Ezen az oldalon, illetve az alkalmazás Profil menüjében tudod elindítani a
              Licitera-fiókod végleges törlését. A törlés megerősítéshez kötött, és a
              folyamat befejezése után a fiókhoz tartozó hozzáférés megszűnik.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Apple App Store kompatibilis
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Google Play kompatibilis
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Licitera
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="h-5 w-5" />
              Hogyan működik a fióktörlés?
            </CardTitle>
            <CardDescription>
              A fiók törlése közvetlenül a platformon belül indítható el.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Lépések</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>• jelentkezz be a Licitera fiókodba,</div>
                <div>• nyisd meg a Profil oldalt vagy ezt az oldalt,</div>
                <div>• válaszd a fiók törlését,</div>
                <div>• erősítsd meg kétszer a törlési szándékodat,</div>
                <div>• a rendszer elindítja a fiók végleges törlését.</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Törlés indítása</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                A törlés visszafordíthatatlan művelet. Kérjük, csak akkor folytasd, ha biztos vagy a döntésedben.
              </div>

              <div className="mt-4">
                <Button
                  variant="destructive"
                  className="rounded-2xl"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  {loading ? "Fiók törlése..." : "Fiók végleges törlése"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-amber-900">Fontos</div>
                  <div className="mt-1 text-sm leading-6 text-amber-800">
                    A fióktörlés után a hozzáférésed megszűnik. Bizonyos adatokat jogszabályi,
                    csalásmegelőzési, biztonsági vagy számviteli okból a szükséges ideig továbbra is
                    megőrizhetünk.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock3 className="h-5 w-5" />
              Feldolgozási idő
            </CardTitle>
            <CardDescription>
              Mennyi idő alatt zárul le a folyamat.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-3xl font-black text-slate-900">Azonnali indítás</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                A törlési folyamat a megerősítés után azonnal elindul. Bizonyos adatok
                technikai, jogi vagy számviteli okból elkülönítve, korlátozott hozzáféréssel
                tovább megőrizhetők.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-5 w-5" />
            Milyen adatokat törlünk?
          </CardTitle>
          <CardDescription>
            A törlési folyamat során a Licitera a szükséges mértékben törli vagy anonimizálja a
            fiókhoz kapcsolódó adatokat.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Jellemzően törölt vagy anonimizált adatok</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <div>• profilhoz tartozó személyes adatok,</div>
                <div>• fiókadatok és kapcsolódó azonosítók,</div>
                <div>• figyelőlista és kapcsolódó személyes adatok,</div>
                <div>• olyan személyes tartalmak, amelyek megőrzésére nincs külön jogalap,</div>
                <div>• a további aktív fiókhasználat megszüntetése.</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Korlátozás / leválasztás</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <div>• egyes adatok törlés helyett anonimizálhatók,</div>
                <div>• bizonyos tranzakciós vagy naplózási adatok leválaszthatók a személyedről,</div>
                <div>• a megőrzendő adatokhoz való hozzáférést belsőleg korlátozzuk,</div>
                <div>• a fiókhoz köthető nyilvános információk személyes jellegét megszüntethetjük.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Milyen adatokat tarthatunk meg?
          </CardTitle>
          <CardDescription>
            Bizonyos adatokat a fióktörlés ellenére is meg kell őriznünk vagy megőrizhetünk.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            A Licitera a fióktörlést követően is megőrizhet bizonyos adatokat, amennyiben ezt
            jogszabály írja elő, vagy az adatkezelő jogos érdeke indokolja. Ilyenek lehetnek különösen:
            <div className="mt-3 space-y-2">
              <div>• számlázási és pénzügyi bizonylatokhoz kapcsolódó adatok,</div>
              <div>• könyvelési és adójogi kötelezettségek teljesítéséhez szükséges adatok,</div>
              <div>• csalásmegelőzési, visszaélés-megelőzési vagy biztonsági naplóadatok,</div>
              <div>• jogviták, panaszok vagy hatósági eljárások kezeléséhez szükséges információk,</div>
              <div>• olyan tranzakciós adatok, amelyek megőrzése a platform működésének jogszerű dokumentálásához szükséges.</div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
              Ezeket az adatokat kizárólag a szükséges ideig őrizzük meg, a vonatkozó jogszabályok,
              illetve az adatkezelés jogalapja által indokolt időtartamig.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5" />
            Kapcsolódó információk
          </CardTitle>
          <CardDescription>
            További adatkezelési részleteket a Licitera hivatalos dokumentumaiban találsz.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/legal/privacy"
              className="rounded-2xl border bg-white p-4 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Adatkezelési tájékoztató
            </a>
            <a
              href="/legal/aszf"
              className="rounded-2xl border bg-white p-4 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Általános Szerződési Feltételek
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}