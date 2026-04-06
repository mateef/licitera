"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, FileText, ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Szolgáltató adatai és az ÁSZF hatálya",
    body: [
      "Szolgáltató neve: Fodor Máté Áron e.v.",
      "Székhely: 2700 Cegléd, Árpa utca 3.",
      "E-mail: fmate2000@gmail.com",
      "Telefonszám: +36305873830",
      "Adószám: 91889102-1-33",
      "A jelen Általános Szerződési Feltételek a Licitera online aukciós piactér használatára vonatkoznak.",
      "A jelen feltételek hatálya kiterjed minden felhasználóra, aki a platformot meglátogatja, regisztrálja magát, hirdetést ad fel, licitál, villámáras vásárlást kezdeményez, illetve a platform bármely funkcióját használja.",
      "A Licitera egy online aukciós piactér, ahol a felhasználók saját termékeiket hirdethetik meg és licit útján vagy villámáras vásárlással értékesíthetik.",
      "A jelen ÁSZF elfogadása a szolgáltatás használatának feltétele.",
    ],
  },
  {
    title: "2. A szolgáltatás jellege és a Szolgáltató szerepe",
    body: [
      "A Licitera közvetítő online platformként működik.",
      "A Szolgáltató nem eladó, nem vevő, és nem szerződő fél a felhasználók között létrejövő adásvételi jogviszonyban.",
      "A platform feladata a hirdetések közzététele, a licitek kezelése, az aukció lezárásának technikai lebonyolítása, a villámáras vásárlás támogatása, valamint a sikeres tranzakciót követően a felek kapcsolatfelvételének elősegítése.",
      "A Szolgáltató nem vállal kötelezettséget arra, hogy a felhasználók közötti adásvétel ténylegesen teljesül, vagy hogy a felek vitája rendeződik.",
    ],
  },
  {
    title: "3. Regisztráció, fiókhasználat és életkori feltételek",
    body: [
      "A szolgáltatás használatához egyes funkciók esetén regisztráció szükséges.",
      "A felhasználó kizárólag valós, pontos és saját adatokat jogosult megadni.",
      "A felhasználó felelős a fiókjához kapcsolódó belépési adatok biztonságos kezeléséért, valamint minden olyan tevékenységért, amely a fiókján keresztül történik.",
      "A szolgáltatás kizárólag 18. életévüket betöltött természetes személyek számára használható.",
      "A regisztráció során a felhasználó nyilatkozik arról, hogy elmúlt 18 éves. A valótlan nyilatkozat megtétele a jelen feltételek megsértésének minősül.",
      "A telefonszám hitelesítése a platform biztonságos működése és a visszaélések megelőzése érdekében kötelező lehet egyes funkciók használatához.",
      "A Szolgáltató jogosult a fiók használatát korlátozni, felfüggeszteni vagy megszüntetni, ha alapos okkal feltételezhető, hogy a megadott adatok valótlanok, hiányosak, megtévesztőek vagy jogellenes célból kerültek megadásra.",
    ],
  },
  {
    title: "4. Hirdetésfeladás szabályai",
    body: [
      "A felhasználó kizárólag olyan terméket jogosult meghirdetni, amelynek értékesítésére jogszerűen jogosult.",
      "Tilos jogszabályba ütköző, megtévesztő, valótlan, hiányos, sértő, illetve más személy vagy szervezet jogait sértő tartalom közzététele.",
      "A hirdetésben szereplő adatoknak valósnak, egyértelműnek és a döntéshozatalhoz szükséges mértékben teljes körűnek kell lenniük.",
      "A hirdetéshez feltöltött képeknek a meghirdetett terméket kell ábrázolniuk, illetve a leíráshoz érdemben kapcsolódniuk kell.",
      "A Szolgáltató jogosult a jelen feltételekbe vagy jogszabályba ütköző hirdetéseket előzetes értesítés nélkül eltávolítani, korlátozni vagy felülvizsgálat alá vonni.",
      "A Szolgáltató jogosult bizonyos termékkörök vagy hirdetési tartalmak közzétételét korlátozni vagy tiltani, különösen, ha azok jogszabályba ütköznek, fokozott kockázatot hordoznak, vagy a platform rendeltetésszerű működését veszélyeztetik.",
    ],
  },
  {
    title: "5. Tiltott termékek és tiltott magatartások",
    body: [
      "Tilos különösen jogszabályba ütköző, hamisított, lopott, veszélyes, megtévesztő, illetve engedélyhez kötött, de megfelelő jogosultság nélkül kínált termékek hirdetése.",
      "Tilos más személy adataival visszaélni, hamis liciteket elhelyezni, mesterségesen felverni az árat, a platformot csalárd célból használni, vagy más felhasználókat zaklatni, megfélemlíteni, fenyegetni.",
      "Tilos a platform technikai működésének megkerülése, manipulálása, automatizált vagy visszaélésszerű használata.",
      "A jelen pontba ütköző magatartás súlyos szerződésszegésnek minősül, és azonnali korlátozást vagy kizárást vonhat maga után.",
    ],
  },
  {
    title: "6. Licitálás szabályai",
    body: [
      "A licit kötelező érvényű ajánlatnak minősül.",
      "A licitáló a licit leadásával vállalja, hogy nyerés esetén a terméket a meghirdetett feltételek szerint megvásárolja.",
      "Azonos összegű licit esetén a korábban beérkezett licit élvez elsőbbséget.",
      "A rendszer maximum licitet is kezelhet, amely automatikus licitlépcsőkkel működik a felhasználó által megadott felső határig.",
      "A felhasználó felelős azért, hogy licitje leadásakor a hirdetés tartalmát, az átvételi vagy szállítási feltételeket, valamint a termék jellemzőit előzetesen megismerje.",
    ],
  },
  {
    title: "7. Villámár, aukciózárás és kapcsolatfelvétel",
    body: [
      "Amennyiben a hirdetéshez villámár tartozik, a vevő a villámáras vásárlással az aukciót azonnal lezárhatja.",
      "Normál aukció esetén a legmagasabb érvényes licit minősül nyertesnek a lejárat időpontjában.",
      "Ha az aukció utolsó perceiben új licit érkezik, a rendszer az aukció végét automatikusan meghosszabbíthatja a platformon megjelenített szabályok szerint.",
      "Sikeres aukciózárás vagy villámáras vásárlás esetén a platform a tranzakció teljesítésének elősegítése érdekében a vevő és az eladó között kapcsolatfelvételi adatokat tehet hozzáférhetővé.",
      "Ennek keretében a felek e-mail címe és telefonszáma a másik fél részére megosztásra kerülhet, valamint ezen adatok a platform belső chatfelületén, rendszerüzenetben vagy külön e-mailben is továbbításra kerülhetnek.",
    ],
  },
  {
    title: "8. Díjak, előfizetések és egyenleg",
    body: [
      "A platform a sikeres értékesítések után rendszerhasználati díjat számíthat fel.",
      "A platformon előfizetéses csomagok is elérhetők lehetnek, amelyek részletes feltételei, időtartama, díjazása és előnyei a platform felületén vagy az alkalmazás előfizetési képernyőjén jelennek meg.",
      "Az előfizetések automatikusan megújuló konstrukcióként is működhetnek, amennyiben ezt a felhasználó a megfelelő áruházi vagy fizetési felületen elfogadja.",
      "Az előfizetések kezelése, lemondása és módosítása történhet az App Store, a Google Play vagy más kapcsolódó fizetési szolgáltató felületén, a konkrét előfizetés típusától függően.",
      "Az aktuális díjazásra, előfizetési konstrukciókra és kapcsolódó szabályokra vonatkozó részletes információk a platform felületén külön is megjelenhetnek.",
      "A díjak a felhasználó belső egyenlegében kerülhetnek nyilvántartásra.",
      "Negatív egyenleg esetén a felhasználó egyes funkciókhoz való hozzáférése korlátozható, különösen új hirdetés feladásának lehetősége.",
      "A Szolgáltató jogosult a díjakat és előfizetési feltételeket módosítani, azonban az ilyen módosításokat a felhasználók felé megfelelő módon közzéteszi.",
    ],
  },
  {
    title: "9. Felelősség kizárása",
    body: [
      "A Szolgáltató nem vállal felelősséget a felhasználók között létrejövő adásvétel teljesítéséért, a termék minőségéért, állapotáért, jogszerűségéért, szállításáért, valamint a felek közötti bármely jogvita tartalmáért vagy következményeiért.",
      "A felhasználók egymással saját felelősségükre kötnek megállapodást.",
      "A Szolgáltató nem garantálja, hogy minden hirdetés valós, teljes, naprakész vagy hibamentes.",
      "A Szolgáltató nem felel a platform időszakos elérhetetlenségéért, technikai hibákért, külső szolgáltatók kieséséért, vis maior helyzetekért vagy a felhasználó oldalán felmerülő technikai problémákért.",
    ],
  },
  {
    title: "10. Moderáció és intézkedések",
    body: [
      "A Szolgáltató jogosult a platform biztonságos, jogszerű és rendeltetésszerű működésének biztosítása érdekében moderációs intézkedéseket alkalmazni.",
      "Ennek keretében hirdetés törölhető, felhasználói tartalom korlátozható, felhasználói hozzáférés ideiglenesen felfüggeszthető vagy véglegesen megszüntethető.",
      "A felhasználói jelentések, automatikus ellenőrzések és adminisztratív döntések alapján a platform szabályait sértő magatartás szankcionálható.",
      "A Szolgáltató egyedi mérlegelés alapján jogosult a vitatott tartalmak ideiglenes elrejtésére, manuális ellenőrzésére vagy végleges eltávolítására.",
    ],
  },
  {
    title: "11. Panaszkezelés és kapcsolattartás",
    body: [
      "A felhasználó a szolgáltatással kapcsolatos panaszát vagy észrevételét a Szolgáltató részére elsősorban elektronikus úton, a megadott e-mail címen küldheti meg.",
      "A Szolgáltató a panaszokat és megkereséseket észszerű határidőn belül megvizsgálja és megválaszolja.",
      "A felhasználó fogyasztói jogvita esetén jogosult lehet békéltető testületi vagy egyéb, jogszabályban meghatározott eljárást kezdeményezni.",
    ],
  },
  {
    title: "12. Fióktörlés, megszűnés és adatmegőrzéshez kapcsolódó szabályok",
    body: [
      "A felhasználó kérheti fiókjának megszüntetését, azonban a már lezárt vagy folyamatban lévő tranzakciókhoz kapcsolódó egyes adatok megőrzése jogszabályi kötelezettség vagy jogos érdek alapján szükséges lehet.",
      "A Szolgáltató jogosult a szolgáltatás nyújtását részben vagy egészben módosítani, korlátozni vagy megszüntetni.",
      "A szolgáltatás megszűnése vagy a fiók törlése nem érinti automatikusan a korábban létrejött jogviszonyokból eredő kötelezettségeket, különösen a díjfizetéssel, panaszkezeléssel vagy jogérvényesítéssel kapcsolatos igényeket.",
    ],
  },
  {
    title: "13. Vegyes rendelkezések",
    body: [
      "A jelen ÁSZF elfogadása a szolgáltatás használatának feltétele.",
      "A Szolgáltató jogosult a jelen ÁSZF-et egyoldalúan módosítani.",
      "A módosított feltételek a közzétételt követően lépnek hatályba, kivéve, ha jogszabály vagy a Szolgáltató ettől eltérően rendelkezik.",
      "A jelen feltételekre a magyar jog rendelkezései irányadók.",
      "Amennyiben a jelen ÁSZF valamely rendelkezése érvénytelen vagy végrehajthatatlan lenne, az nem érinti a többi rendelkezés érvényességét.",
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
  Kérjük, a Licitera használata előtt figyelmesen olvasd el ezt a tájékoztatót.
  A regisztrációval, a hirdetésfeladással, a licitálással, a villámáras vásárlással,
  valamint a platform bármely funkciójának használatával elfogadod a jelen feltételeket.
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