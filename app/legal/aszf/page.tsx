"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, FileText, ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Szolgáltató adatai",
    body: [
      "Szolgáltató neve: Fodor Máté Áron e.v.",
      "Székhely: 2700 Cegléd, Árpa utca 3.",
      "E-mail: fmate2000@gmail.com",
      "Telefonszám: +36305873830",
      "Adószám: 91889102-1-33",
      "A Licitera egy online aukciós piactér, ahol a felhasználók saját termékeiket hirdethetik meg és licit útján vagy villámáras vásárlással értékesíthetik.",
    ],
  },
  {
    title: "2. A szolgáltatás jellege",
    body: [
      "A Licitera közvetítő online platformként működik.",
      "A Szolgáltató nem eladó, nem vevő, és nem szerződő fél a felhasználók között létrejövő adásvételi jogviszonyban.",
      "A platform feladata a hirdetések közzététele, a licitek kezelése, az aukció lezárásának technikai lebonyolítása, valamint a sikeres tranzakciót követően a felek kapcsolatfelvételének elősegítése.",
    ],
  },
  {
    title: "3. Regisztráció és fiókhasználat",
    body: [
      "A szolgáltatás használatához egyes funkciók esetén regisztráció szükséges.",
      "A felhasználó kizárólag valós, pontos és saját adatokat jogosult megadni.",
      "A felhasználó felelős a fiókjához kapcsolódó belépési adatok biztonságos kezeléséért, valamint minden olyan tevékenységért, amely a fiókján keresztül történik.",
      "A szolgáltatás kizárólag 18. életévüket betöltött természetes személyek számára használható.",
      "A telefonszám hitelesítése a platform biztonságos működése és a visszaélések megelőzése érdekében kötelező lehet egyes funkciók használatához.",
    ],
  },
  {
    title: "4. Hirdetésfeladás szabályai",
    body: [
      "A felhasználó kizárólag olyan terméket jogosult meghirdetni, amelynek értékesítésére jogszerűen jogosult.",
      "Tilos jogszabályba ütköző, megtévesztő, valótlan, hiányos, sértő, illetve más személy vagy szervezet jogait sértő tartalom közzététele.",
      "A hirdetésben szereplő adatoknak valósnak, egyértelműnek és a döntéshozatalhoz szükséges mértékben teljes körűnek kell lenniük.",
      "A Szolgáltató jogosult a jelen feltételekbe vagy jogszabályba ütköző hirdetéseket előzetes értesítés nélkül eltávolítani, illetve korlátozni.",
    ],
  },
  {
    title: "5. Licitálás szabályai",
    body: [
      "A licit kötelező érvényű ajánlatnak minősül.",
      "A licitáló a licit leadásával vállalja, hogy nyerés esetén a terméket a meghirdetett feltételek szerint megvásárolja.",
      "Azonos összegű licit esetén a korábban beérkezett licit élvez elsőbbséget.",
      "A rendszer maximum licitet is kezelhet, amely automatikus licitlépcsőkkel működik a felhasználó által megadott felső határig.",
    ],
  },
  {
    title: "6. Villámár, aukciózárás és kapcsolatfelvétel",
    body: [
      "Amennyiben a hirdetéshez villámár tartozik, a vevő a villámáras vásárlással az aukciót azonnal lezárhatja.",
      "Normál aukció esetén a legmagasabb érvényes licit minősül nyertesnek a lejárat időpontjában.",
      "Ha az aukció utolsó perceiben új licit érkezik, a rendszer az aukció végét automatikusan meghosszabbíthatja.",
      "Sikeres aukciózárás vagy villámáras vásárlás esetén a platform a tranzakció teljesítésének elősegítése érdekében a vevő és az eladó között kapcsolatfelvételi adatokat tehet hozzáférhetővé.",
      "Ennek keretében a felek e-mail címe és telefonszáma a másik fél részére megosztásra kerülhet, valamint ezen adatok a platform belső chatfelületén és külön rendszerüzenetben vagy e-mailben is továbbításra kerülhetnek.",
    ],
  },
  {
    title: "7. Díjak és egyenleg",
    body: [
      "A platform a sikeres értékesítések után rendszerhasználati díjat számíthat fel.",
      "Az aktuális díjazásra, előfizetési konstrukciókra és kapcsolódó szabályokra vonatkozó részletes információk a platform felületén külön is megjelenhetnek.",
      "A díjak a felhasználó belső egyenlegében kerülhetnek nyilvántartásra.",
      "Negatív egyenleg esetén a felhasználó egyes funkciókhoz való hozzáférése korlátozható, különösen új hirdetés feladásának lehetősége.",
    ],
  },
  {
    title: "8. Felelősség kizárása",
    body: [
      "A Szolgáltató nem vállal felelősséget a felhasználók között létrejövő adásvétel teljesítéséért, a termék minőségéért, állapotáért, jogszerűségéért, szállításáért, valamint a felek közötti bármely jogvita tartalmáért vagy következményeiért.",
      "A felhasználók egymással saját felelősségükre kötnek megállapodást.",
      "A Szolgáltató nem garantálja, hogy minden hirdetés valós, teljes, naprakész vagy hibamentes.",
    ],
  },
  {
    title: "9. Moderáció és intézkedések",
    body: [
      "A Szolgáltató jogosult a platform biztonságos, jogszerű és rendeltetésszerű működésének biztosítása érdekében moderációs intézkedéseket alkalmazni.",
      "Ennek keretében hirdetés törölhető, felhasználói tartalom korlátozható, felhasználói hozzáférés ideiglenesen felfüggeszthető vagy véglegesen megszüntethető.",
      "A felhasználói jelentések, automatikus ellenőrzések és adminisztratív döntések alapján a platform szabályait sértő magatartás szankcionálható.",
    ],
  },
  {
    title: "10. Megszűnés és fióktörlés",
    body: [
      "A felhasználó kérheti fiókjának megszüntetését, azonban a már lezárt vagy folyamatban lévő tranzakciókhoz kapcsolódó egyes adatok megőrzése jogszabályi kötelezettség vagy jogos érdek alapján szükséges lehet.",
      "A Szolgáltató jogosult a szolgáltatás nyújtását részben vagy egészben módosítani, korlátozni vagy megszüntetni.",
    ],
  },
  {
    title: "11. Vegyes rendelkezések",
    body: [
      "A jelen ÁSZF elfogadása a szolgáltatás használatának feltétele.",
      "A Szolgáltató jogosult a jelen ÁSZF-et egyoldalúan módosítani.",
      "A módosított feltételek a közzétételt követően lépnek hatályba, kivéve, ha jogszabály vagy a Szolgáltató ettől eltérően rendelkezik.",
      "A jelen feltételekre a magyar jog rendelkezései irányadók.",
    ],
  },
];

export default function AszfPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.92),rgba(255,255,255,0.98),rgba(245,208,254,0.68))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <FileText className="h-3.5 w-3.5" />
            Jogi dokumentum
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Általános Szerződési
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
              Feltételek
            </span>
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Kérjük, a Licitera használata előtt figyelmesen olvasd el ezt a
            tájékoztatót. A szolgáltatás használatával a jelen feltételeket elfogadod.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
              Platformhasználat
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
              Aukciós szabályok
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
              Felelősségi körök
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Mikor fontos?</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Regisztráció, hirdetésfeladás, licitálás és sikeres aukciózárás előtt különösen érdemes átolvasni.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Mi van benne?</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A platform működése, a licitálás szabályai, a felelősségi kérdések és a moderáció alapelvei.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title} className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <CardContent className="pt-6">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                {section.title}
              </h2>

              <div className="mt-4 space-y-3">
                {section.body.map((item, index) => (
                  <p key={`${section.title}-${index}`} className="text-sm leading-7 text-slate-600">
                    {item}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}