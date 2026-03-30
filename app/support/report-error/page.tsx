"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Mail, MonitorSmartphone } from "lucide-react";

export default function ReportErrorPage() {
  const [subject, setSubject] = useState("Licitera hiba bejelentés");
  const [description, setDescription] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("Web");

  const mailBody = useMemo(() => {
    return [
      "Szia!",
      "",
      "Hibát szeretnék jelenteni a Licitera platformon.",
      "",
      "Rövid leírás:",
      description || "[ide írd a hibát]",
      "",
      "Eszköz / platform:",
      deviceInfo || "[eszköz]",
      "",
      "Köszönöm!",
    ].join("\n");
  }, [description, deviceInfo]);

  const mailHref = useMemo(() => {
    return (
      `mailto:fmate2000@gmail.com` +
      `?subject=${encodeURIComponent(subject.trim() || "Licitera hiba bejelentés")}` +
      `&body=${encodeURIComponent(mailBody)}`
    );
  }, [mailBody, subject]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,237,213,0.92),rgba(255,255,255,0.98),rgba(254,242,242,0.78))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Segítség a hibajavításban
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Hiba jelentése
            <span className="block bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
              pár lépésben
            </span>
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Minél pontosabban írod le a hibát, annál gyorsabban tudjuk ellenőrizni és javítani.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Hibabejelentő űrlap
            </h2>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tárgy</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Pl. Licit leadásánál hibát tapasztaltam"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Mi történt?</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Írd le röviden, mit csináltál és milyen hibát tapasztaltál."
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Eszköz / platform</label>
                <div className="relative">
                  <MonitorSmartphone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={deviceInfo}
                    onChange={(e) => setDeviceInfo(e.target.value)}
                    placeholder="Pl. Web, iPhone, Android"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none"
                  />
                </div>
              </div>

              <Button asChild className="h-12 w-full rounded-2xl">
                <a href={mailHref}>Megnyitás e-mailben</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <CardContent className="pt-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Mail className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                Előnézet
              </h2>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {mailBody}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Kapcsolati e-mail
              </h2>

              <a
                href={mailHref}
                className="mt-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-primary"
              >
                fmate2000@gmail.com
              </a>

              <div className="mt-5 text-sm leading-7 text-slate-600">
                Érdemes megadni:
                <br />• mi történt pontosan
                <br />• mikor történt
                <br />• melyik oldalon vagy funkciónál jelent meg
                <br />• milyen eszközön vagy böngészőben használtad
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}