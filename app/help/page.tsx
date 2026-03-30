"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, HelpCircle, ShieldCheck, Sparkles } from "lucide-react";

const FAQS = [
  {
    q: "Hogyan működik a licitálás?",
    a: "A licitálás során a rendszer mindig a legmagasabb érvényes ajánlatot veszi figyelembe. Ha maximum licitet is megadsz, a rendszer automatikusan licitál helyetted a megadott határig.",
  },
  {
    q: "Mi történik, ha megnyerem az aukciót?",
    a: "A sikeres lezárás után a másik féllel chatben tudtok egyeztetni az átvételről, szállításról és minden további részletről.",
  },
  {
    q: "Mikor tudok értékelést adni?",
    a: "Értékelést lezárt, sikeres tranzakció után tudsz leadni. Az értékelések megjelennek a felhasználói profilokon.",
  },
  {
    q: "Miért fontos a telefonszám hitelesítése?",
    a: "A telefonszám hitelesítése segít csökkenteni a visszaéléseket, és növeli a platform biztonságát.",
  },
  {
    q: "Mit jelent a negatív egyenleg?",
    a: "A negatív egyenleg azt jelenti, hogy a rendszerhasználati díjak miatt rendezned kell az egyenlegedet. Ilyenkor bizonyos funkciók korlátozva lehetnek, például új aukció feladása.",
  },
  {
    q: "Hogyan tudok hibát jelenteni?",
    a: "A Hiba jelentése oldalon keresztül tudsz nekünk írni, ahol előkészített sablonnal is segítjük a gyors hibabejelentést.",
  },
];

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="text-sm font-bold leading-6 text-slate-900">{question}</div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">{answer}</p>
      ) : null}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.92),rgba(255,255,255,0.98),rgba(224,231,255,0.75))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <HelpCircle className="h-3.5 w-3.5" />
            Segítség központ
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Segítség és
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              gyakori kérdések
            </span>
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Itt találod a leggyakoribb kérdéseket a licitálásról, vásárlásról,
            chatről, értékelésekről és a platform működéséről.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Licitálás</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hogyan működik a licit, maximum licit és aukciózárás.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Biztonság</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Telefonszám-hitelesítés, visszaélések csökkentése és felelősségi tudnivalók.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Használat</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hirdetésfeladás, értékelések, chat és hibabejelentés.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Gyakori kérdések
          </h2>

          <div className="mt-5 space-y-3">
            {FAQS.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Röviden a működésről
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            A Licitera egy aukciós piactér, ahol a felhasználók licitálhatnak
            egymás termékeire. A sikeres aukció után a felek közvetlenül tudnak
            egyeztetni a chatben, majd a tranzakció lezárulta után értékelhetik
            egymást.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}