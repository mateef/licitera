export const metadata = {
  title: "Adatkezelési tájékoztató | Privacy Policy | Licitera",
  description:
    "A Licitera mobilalkalmazás és szolgáltatás adatkezelési tájékoztatója magyar és angol nyelven.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Adatkezelési tájékoztató / Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Hatálybalépés / Effective date: 2026. 03. 25.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Szolgáltató / Service Provider: <strong>Fodor Máté Áron</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Kapcsolat / Contact: <strong>fmate2000@gmail.com</strong>
          </p>
        </div>

        <div className="space-y-10 text-slate-800">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Magyar</h2>
            <p className="leading-7">
              Jelen adatkezelési tájékoztató a <strong>Licitera</strong> mobilalkalmazásra és a hozzá
              kapcsolódó szolgáltatásokra vonatkozik, amelyeket Fodor Máté Áron mint szolgáltató
              nyújt. A szolgáltatás jelen formájában, "AS IS" alapon érhető el.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">
              Milyen adatokat gyűjt az alkalmazás és mire használja?
            </h3>
            <p className="leading-7">
              Az alkalmazás olyan adatokat kezelhet, amelyeket a felhasználó ad meg regisztráció,
              bejelentkezés, profilkitöltés, licitálás, hirdetésfeladás, fizetés vagy az alkalmazás
              használata során.
            </p>
            <p className="leading-7">Ilyen adatok lehetnek különösen:</p>
            <ul className="list-disc space-y-2 pl-6 leading-7">
              <li>név, email-cím, telefonszám,</li>
              <li>felhasználói fiókhoz kapcsolódó adatok,</li>
              <li>hirdetésekhez, licitekhez, vásárlásokhoz kapcsolódó adatok,</li>
              <li>fizetéssel és előfizetéssel kapcsolatos állapotadatok,</li>
              <li>kapcsolatfelvételi és ügyfélszolgálati kommunikáció.</li>
            </ul>
            <p className="leading-7">
              Ezeket az adatokat a szolgáltató az alkalmazás működtetéséhez, a felhasználói élmény
              javításához, fontos tájékoztatások küldéséhez, jogi kötelezettségek teljesítéséhez,
              valamint bizonyos esetekben promóciós kommunikációhoz használhatja.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">
              Automatikusan gyűjtött adatok
            </h3>
            <p className="leading-7">
              Az alkalmazás bizonyos adatokat automatikusan is gyűjthet, például:
            </p>
            <ul className="list-disc space-y-2 pl-6 leading-7">
              <li>készüléktípus, operációs rendszer, egyedi eszközazonosító,</li>
              <li>IP-cím, mobilböngésző típusa,</li>
              <li>az alkalmazás használatára vonatkozó technikai és analitikai adatok.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Helyadatok</h3>
            <p className="leading-7">
              Az alkalmazás nem gyűjt pontos, valós idejű helyadatot a felhasználó mobileszközéről.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Mesterséges intelligencia</h3>
            <p className="leading-7">
              Az alkalmazás egyes funkciók javítása érdekében mesterséges intelligencia alapú
              technológiákat is használhat. Ezek célja lehet például személyre szabott tartalom,
              ajánlások megjelenítése, automatizált funkciók működtetése vagy a felhasználói élmény
              javítása. Az ilyen adatkezelés minden esetben a jelen tájékoztatóval és az irányadó
              jogszabályokkal összhangban történik.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">
              Harmadik felek és adatmegosztás
            </h3>
            <p className="leading-7">
              Az alkalmazás működtetéséhez a szolgáltató harmadik fél szolgáltatókat is igénybe vehet,
              például tárhely, adatbázis, hitelesítés, fizetés, előfizetéskezelés vagy elemzés céljából.
            </p>
            <p className="leading-7">Ilyen szolgáltatók lehetnek különösen:</p>
            <ul className="list-disc space-y-2 pl-6 leading-7">
              <li>Supabase</li>
              <li>Stripe</li>
              <li>RevenueCat</li>
              <li>Apple App Store</li>
              <li>Google Play</li>
              <li>Számlázz.hu</li>
            </ul>
            <p className="leading-7">
              A szolgáltató adatot kizárólag a szükséges mértékben oszthat meg megbízható partnerekkel,
              illetve jogszabályi kötelezettség, hatósági megkeresés, csalásmegelőzés vagy a felhasználók
              biztonságának védelme érdekében.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Adatmegőrzés</h3>
            <p className="leading-7">
              A szolgáltató a felhasználó által megadott adatokat a felhasználói jogviszony fennállása
              alatt, valamint ezt követően ésszerű ideig megőrizheti. Az automatikusan gyűjtött adatokat
              legfeljebb 24 hónapig tárolhatja, ezt követően aggregált, anonimizált formában is megőrizheti.
            </p>
            <p className="leading-7">
              Törlési igény esetén a felhasználó a szolgáltatóhoz fordulhat a következő email-címen:
              <strong> fmate2000@gmail.com</strong>.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Gyermekek adatainak védelme</h3>
            <p className="leading-7">
              Az alkalmazás nem gyermekek számára készült, és a szolgáltató nem gyűjt tudatosan 13 év
              alatti gyermekektől személyes adatot. Ha felmerül, hogy ilyen adat került a rendszerbe,
              kérjük, jelezd a fenti elérhetőségen.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Adatbiztonság</h3>
            <p className="leading-7">
              A szolgáltató megfelelő technikai és szervezési intézkedéseket alkalmaz az adatok
              védelmére. Ugyanakkor egyetlen rendszer sem garantál teljes körű biztonságot.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">A tájékoztató módosítása</h3>
            <p className="leading-7">
              A szolgáltató a jelen tájékoztatót időről időre módosíthatja. A változások ezen az oldalon
              kerülnek közzétételre. Az alkalmazás további használata a módosítások elfogadását jelentheti.
            </p>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-8">
            <h2 className="text-2xl font-semibold text-slate-900">English</h2>
            <p className="leading-7">
              This privacy policy applies to the <strong>Licitera</strong> mobile application and related
              services, which are provided by Fodor Máté Áron as the Service Provider. This service is
              provided on an "AS IS" basis.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              What information does the Application obtain and how is it used?
            </h3>
            <p className="leading-7">
              The Application may collect information you provide when you register, sign in, complete
              your profile, create listings, place bids, make purchases, subscribe, make payments, or
              otherwise use the service.
            </p>
            <p className="leading-7">This may include, in particular:</p>
            <ul className="list-disc space-y-2 pl-6 leading-7">
              <li>name, email address, phone number,</li>
              <li>account-related information,</li>
              <li>listing, bidding, and purchase-related information,</li>
              <li>payment and subscription status information,</li>
              <li>support and communication data.</li>
            </ul>
            <p className="leading-7">
              The Service Provider may use this information to operate the Application, improve the user
              experience, send important notices, comply with legal obligations, and in some cases send
              promotional communications.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              What information does the Application collect automatically?
            </h3>
            <p className="leading-7">
              The Application may collect certain information automatically, including but not limited to:
            </p>
            <ul className="list-disc space-y-2 pl-6 leading-7">
              <li>mobile device type, operating system, unique device identifier,</li>
              <li>IP address, mobile browser type,</li>
              <li>technical and analytics information about how the Application is used.</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900">
              Does the Application collect precise real-time location information?
            </h3>
            <p className="leading-7">
              This Application does not collect precise real-time information about the location of your
              mobile device.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              Does the Application use Artificial Intelligence (AI) technologies?
            </h3>
            <p className="leading-7">
              The Application may use AI-based technologies to improve certain features, provide
              personalized content or recommendations, automate certain functions, and improve the user
              experience. Any such processing is carried out in accordance with this Privacy Policy and
              applicable laws.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              Do third parties see and/or have access to information obtained by the Application?
            </h3>
            <p className="leading-7">
              The Service Provider may use trusted third-party service providers for hosting, database,
              authentication, payments, subscription management, invoicing, analytics, and other core
              operations.
            </p>
            <p className="leading-7">These may include, in particular:</p>
            <ul className="list-disc space-y-2 pl-6 leading-7">
              <li>Supabase</li>
              <li>Stripe</li>
              <li>RevenueCat</li>
              <li>Apple App Store</li>
              <li>Google Play</li>
              <li>Szamlazz.hu</li>
            </ul>
            <p className="leading-7">
              Information may also be disclosed if required by law, to comply with legal process, to
              protect rights or safety, to investigate fraud, or to respond to government requests.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              What is the data retention policy and how can you manage your information?
            </h3>
            <p className="leading-7">
              The Service Provider may retain user-provided information for as long as you use the
              Application and for a reasonable time thereafter. Automatically collected information may be
              retained for up to 24 months and may then be stored in aggregated or anonymized form.
            </p>
            <p className="leading-7">
              If you would like your data to be deleted, please contact:
              <strong> fmate2000@gmail.com</strong>.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              How does the Application address children’s privacy?
            </h3>
            <p className="leading-7">
              The Application is not intended for children and the Service Provider does not knowingly
              collect personally identifiable information from children under the age of 13.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              How is your information kept secure?
            </h3>
            <p className="leading-7">
              The Service Provider uses reasonable technical and organizational safeguards to protect the
              information it processes and maintains. However, no security system can prevent all
              potential security breaches.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">
              How will you be informed of changes to this Privacy Policy?
            </h3>
            <p className="leading-7">
              This Privacy Policy may be updated from time to time. Any changes will be posted on this
              page. Continued use of the Application may be deemed acceptance of those changes.
            </p>

            <h3 className="text-xl font-semibold text-slate-900">How can you contact us?</h3>
            <p className="leading-7">
              If you have any questions regarding privacy while using the Application, or questions about
              the practices, please contact the Service Provider via email at
              <strong> fmate2000@gmail.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}