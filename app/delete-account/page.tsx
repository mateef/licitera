"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Trash2,
  Mail,
  Clock3,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function DeleteAccountPage() {
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
              Fiók törlésének kérelmezése
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Ezen az oldalon tudod kérelmezni a Licitera-fiókod és a hozzá kapcsolódó
              személyes adatok törlését. Az alábbi tájékoztató részletesen bemutatja,
              hogyan kérhető a törlés, milyen adatokat törlünk, és mely adatokat
              tarthatjuk meg jogszabályi vagy jogos érdeken alapuló okból.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Google Play kompatibilis tájékoztató
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
              <Mail className="h-5 w-5" />
              Hogyan kérhető a fióktörlés?
            </CardTitle>
            <CardDescription>
              A fióktörlést jelenleg e-mailben tudod kérelmezni.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Kapcsolatfelvétel</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Küldd el a fióktörlési kérelmedet az alábbi e-mail-címre:
              </div>
              <div className="mt-3 inline-flex rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                fmate2000@gmail.com
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Mit írj bele a kérelmedbe?</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>• a regisztrált e-mail-címedet,</div>
                <div>• a fiókhoz tartozó telefonszámot,</div>
                <div>• és egy egyértelmű kérést arra, hogy a Licitera-fiókodat törölni szeretnéd.</div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-amber-900">Fontos</div>
                  <div className="mt-1 text-sm leading-6 text-amber-800">
                    Ha a kérelmedben megadott adatok alapján nem tudjuk egyértelműen
                    azonosítani a fiókodat, további azonosító adatokat kérhetünk a
                    biztonságos feldolgozás érdekében.
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
              Mennyi idő alatt dolgozzuk fel a kérelmet.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-3xl font-black text-slate-900">30 nap</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                A fióktörlési kérelmeket általában legfeljebb 30 napon belül dolgozzuk fel,
                kivéve, ha jogszabály, vitás ügy, csalásmegelőzési szempont vagy más
                indokolt körülmény ennél hosszabb megőrzést tesz szükségessé.
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
            A törlési kérelem jóváhagyása esetén a Licitera a szükséges mértékben törli
            vagy anonimizálja a fiókhoz kapcsolódó adatokat.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Jellemzően törölt adatok</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <div>• profilhoz tartozó személyes adatok,</div>
                <div>• fiókadatok és kapcsolódó azonosítók,</div>
                <div>• hirdetésekhez kapcsolódó személyes tartalmak,</div>
                <div>• felhasználói beállítások és egyéb, a fiókhoz köthető adatok,</div>
                <div>• olyan kapcsolódó adatok, amelyek megőrzésére nincs külön jogalap.</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Anonimizálás / korlátozás</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <div>• egyes adatok törlés helyett anonimizálhatók,</div>
                <div>• bizonyos tranzakciós vagy naplózási adatok leválaszthatók a személyedről,</div>
                <div>• a megőrzendő adatokhoz való hozzáférést belsőleg korlátozzuk,</div>
                <div>• a további aktív fiókhasználat megszüntetésre kerül.</div>
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
              href="/privacy"
              className="rounded-2xl border bg-white p-4 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Adatkezelési tájékoztató
            </a>
            <a
              href="/aszf"
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