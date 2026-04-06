"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Database, ShieldCheck, UserRound } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Adatkezelő adatai",
    body: [
      "Adatkezelő: Fodor Máté Áron e.v.",
      "Székhely: 2700 Cegléd, Árpa utca 3.",
      "E-mail: fmate2000@gmail.com",
      "Telefonszám: +36305873830",
      "Az Adatkezelő felel a Licitera platform működéséhez kapcsolódó személyes adatok kezeléséért.",
    ],
  },
  {
    title: "2. Kezelt adatok köre",
    body: [
      "A regisztráció és a platform használata során különösen az alábbi adatokat kezelhetjük: név, e-mail cím, telefonszám, profiladatok, hirdetésekhez és licitekhez kapcsolódó adatok, üzenetek, értékelések, számlázási és pénzügyi adatok, push értesítéshez kapcsolódó azonosítók, valamint technikai és naplózási adatok.",
      "A felhasználó által feltöltött képeket a hirdetések létrehozása, megjelenítése és kezelése céljából kezelhetjük.",
      "Sikeres aukciózárás vagy villámáras vásárlás esetén a tranzakció teljesítéséhez szükséges kapcsolattartási adatok – különösen a vevő és az eladó e-mail címe és telefonszáma – a másik fél részére hozzáférhetővé válhatnak.",
    ],
  },
  {
    title: "3. Az adatkezelés célja",
    body: [
      "Felhasználói fiók létrehozása, fenntartása és kezelése.",
      "Aukciók, licitek, villámáras vásárlások és kapcsolódó tranzakciók technikai lebonyolítása.",
      "A felek közötti kapcsolatfelvétel és a sikeres tranzakció teljesítésének elősegítése.",
      "Ennek keretében a sikeres tranzakciót követően a vevő és az eladó kapcsolattartási adatainak megosztása belső chatüzenetben, rendszerüzenetben és szükség esetén e-mail útján is megtörténhet.",
      "Számlázás, díjkezelés, előfizetések kezelése és pénzügyi adminisztráció.",
      "Push értesítések küldése, például licithez, üzenethez, rendszerüzenethez vagy fontos fiókeseményhez kapcsolódóan.",
      "Biztonság, visszaélések megelőzése, moderáció, hibakeresés és jogérvényesítés.",
      "Jogszabályi kötelezettségek teljesítése.",
    ],
  },
  {
    title: "4. Az adatkezelés jogalapja",
    body: [
      "A személyes adatok kezelése elsősorban a felhasználó és az Adatkezelő között létrejövő szolgáltatási jogviszony teljesítéséhez szükséges.",
      "Bizonyos adatkezelések jogszabályi kötelezettség teljesítésén alapulnak, különösen a számviteli, adózási és fogyasztóvédelmi kötelezettségek tekintetében.",
      "Egyes adatkezelések az Adatkezelő jogos érdekén alapulnak, különösen a platform biztonságának fenntartása, a visszaélések megelőzése, a vitás helyzetek kezelése és a szolgáltatás rendeltetésszerű működésének biztosítása érdekében.",
      "Azokban az esetekben, amikor valamely adatkezeléshez hozzájárulás szükséges, az adatkezelés jogalapja a felhasználó önkéntes hozzájárulása.",
      "A sikeres tranzakciót követő kapcsolatfelvételi adatok megosztásának jogalapja a tranzakció teljesítéséhez szükséges adatkezelés.",
    ],
  },
  {
    title: "5. Adatfeldolgozók és technikai partnerek",
    body: [
      "A szolgáltatás működtetéséhez az Adatkezelő külső szolgáltatókat is igénybe vehet.",
      "Ilyen szolgáltatók lehetnek különösen: Supabase, Twilio, Stripe, Resend, Számlázz.hu, RevenueCat, Apple App Store, Google Play, valamint egyéb technikai infrastruktúrát, kommunikációs, értesítési vagy fizetési megoldást biztosító partnerek.",
      "Ezen partnerek kizárólag a szükséges mértékben, a meghatározott adatkezelési célok teljesítéséhez kapcsolódóan férhetnek hozzá az adatokhoz.",
    ],
  },
  {
    title: "6. Címzettek és adattovábbítás",
    body: [
      "A személyes adatokhoz főszabály szerint az Adatkezelő, valamint az általa igénybe vett adatfeldolgozók férhetnek hozzá.",
      "Sikeres aukciózárás vagy villámáras vásárlás esetén az eladó és a vevő egymás részére címzettnek minősülhet a tranzakció teljesítéséhez szükséges kapcsolattartási adatok tekintetében.",
      "Ez azt jelenti, hogy a felek e-mail címe és telefonszáma a másik fél számára a platformon belüli chatben, rendszerüzenetben vagy e-mailben megismerhetővé válhat, amennyiben ez az adásvétel lebonyolításához szükséges.",
      "Előfordulhat, hogy bizonyos technikai partnerek részére az adatok nemzetközi adattovábbítás keretében kerülnek továbbításra vagy hozzáférhetővé válnak, amennyiben ez a szolgáltatás működéséhez szükséges. Ilyen esetben az Adatkezelő megfelelő garanciák alkalmazására törekszik.",
    ],
  },
  {
    title: "7. Adatmegőrzés időtartama",
    body: [
      "A személyes adatokat az Adatkezelő kizárólag a szükséges ideig kezeli.",
      "A fiókhoz kapcsolódó adatokat a fiók fennállásáig, illetve azt követően a jogszabályi kötelezettségek és a jogos érdek által indokolt időtartamig őrizhetjük meg.",
      "Számlázási és pénzügyi adatokat a vonatkozó jogszabályok alapján hosszabb ideig kötelesek lehetünk megőrizni.",
      "A tranzakciókhoz, üzenetekhez, reportokhoz, moderációs eseményekhez és értékelésekhez kapcsolódó adatok megőrzésére a platform működése, a jogérvényesítés, a panaszkezelés és a visszaélések megelőzése érdekében szükség lehet.",
      "A push értesítési tokeneket addig kezelhetjük, amíg azok a szolgáltatás működéséhez szükségesek, vagy amíg a felhasználó az értesítéseket le nem tiltja, illetve a fiókja meg nem szűnik.",
    ],
  },
  {
    title: "8. Felhasználói jogok",
    body: [
      "A felhasználót megilleti a tájékoztatáshoz és hozzáféréshez való jog.",
      "A felhasználó kérheti adatainak helyesbítését.",
      "A felhasználó kérheti adatainak törlését, amennyiben annak nincs jogszabályi vagy egyéb jogszerű akadálya.",
      "A felhasználó kérheti az adatkezelés korlátozását.",
      "A felhasználó tiltakozhat az olyan adatkezelések ellen, amelyek jogos érdeken alapulnak, a vonatkozó jogszabályok keretei között.",
      "A felhasználó panasszal élhet az illetékes felügyeleti hatóságnál is.",
    ],
  },
  {
    title: "9. Adatbiztonság",
    body: [
      "Az Adatkezelő megfelelő technikai és szervezési intézkedéseket alkalmaz a személyes adatok védelme érdekében.",
      "Az adatkezelés során törekszünk arra, hogy az adatokhoz kizárólag az arra jogosult személyek és rendszerek férjenek hozzá.",
      "Az internetes adatátvitel és elektronikus kommunikáció ugyanakkor teljes mértékben soha nem tekinthető kockázatmentesnek, ezért abszolút biztonság nem garantálható.",
    ],
  },
  {
    title: "10. Kapcsolat és jogérvényesítés",
    body: [
      "Adatkezeléssel kapcsolatos kérdés, kérelem vagy panasz esetén az alábbi e-mail címen veheted fel velünk a kapcsolatot: fmate2000@gmail.com",
      "Az Adatkezelő a megkeresésekre a vonatkozó jogszabályok figyelembevételével, észszerű határidőn belül válaszol.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.92),rgba(255,255,255,0.98),rgba(220,252,231,0.7))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Adatvédelem
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Adatkezelési
            <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              tájékoztató
            </span>
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
  Fontos számunkra, hogy átláthatóan tudd, milyen adatokat kezelünk,
  milyen célból, milyen jogalapon, mennyi ideig, kikkel oszthatjuk meg,
  és milyen jogaid vannak ezzel kapcsolatban.
</p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Profiladatok</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Név, e-mail, telefonszám és a fiók működéséhez szükséges adatok.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Database className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Tranzakciós adatok</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hirdetések, licitek, üzenetek, értékelések és kapcsolódó technikai naplók.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80">
          <CardContent className="pt-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="mt-4 text-lg font-black text-slate-900">Adatbiztonság</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Megfelelő technikai és szervezési intézkedésekkel védjük az adatokat.
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