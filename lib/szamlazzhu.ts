function escapeXml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getTagValue(xml: string, tagName: string) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
}

export async function createSzamlazzHuInvoice({
  name,
  email,
  amount,
  description,
  postalCode,
  city,
  addressLine,
  country = "HU",
}: {
  name: string;
  email: string;
  amount: number;
  description: string;
  postalCode: string;
  city: string;
  addressLine: string;
  country?: string;
}) {
  const agentKey = process.env.SZAMLAZZHU_AGENT_KEY;
  const isTest = process.env.SZAMLAZZHU_TEST_MODE === "true";
  const today = new Date().toISOString().split("T")[0];

  if (!agentKey) {
    throw new Error("Hiányzik a SZAMLAZZHU_AGENT_KEY env.");
  }

  if (!postalCode || !city || !addressLine) {
    throw new Error("Hiányzik a számlázási cím valamely kötelező eleme.");
  }

  const netto = Number(amount);
  const afa = 0;
  const brutto = Number(amount);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla">
  <beallitasok>
    <szamlaagentkulcs>${escapeXml(agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
    <teszt>${isTest ? "true" : "false"}</teszt>
  </beallitasok>

  <fejlec>
    <keltDatum>${today}</keltDatum>
    <teljesitesDatum>${today}</teljesitesDatum>
    <fizetesiHataridoDatum>${today}</fizetesiHataridoDatum>
    <fizmod>bankkartya</fizmod>
    <penznem>HUF</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
  </fejlec>

  <elado>
    <bank>Stripe</bank>
  </elado>

  <vevo>
    <nev>${escapeXml(name)}</nev>
    <orszag>${escapeXml(country)}</orszag>
    <irsz>${escapeXml(postalCode)}</irsz>
    <telepules>${escapeXml(city)}</telepules>
    <cim>${escapeXml(addressLine)}</cim>
    <email>${escapeXml(email)}</email>
    <sendEmail>true</sendEmail>
  </vevo>

  <tetelek>
    <tetel>
      <megnevezes>${escapeXml(description)}</megnevezes>
      <mennyiseg>1</mennyiseg>
      <mennyisegiEgyseg>db</mennyisegiEgyseg>
      <nettoEgysegar>${netto}</nettoEgysegar>
      <afakulcs>AAM</afakulcs>
      <nettoErtek>${netto}</nettoErtek>
      <afaErtek>${afa}</afaErtek>
      <bruttoErtek>${brutto}</bruttoErtek>
    </tetel>
  </tetelek>
</xmlszamla>`;

  const formData = new FormData();
  const xmlBlob = new Blob([xml], { type: "text/xml" });

  formData.append("action-xmlagentxmlfile", xmlBlob, "invoice.xml");

  const res = await fetch("https://www.szamlazz.hu/szamla/", {
    method: "POST",
    body: formData,
  });

  const raw = await res.text();

  console.log("SZAMLAZZ STATUS:", res.status);
  console.log("SZAMLAZZ RAW RESPONSE:", raw);

  if (!res.ok) {
    throw new Error(`Számlázz.hu HTTP hiba: ${res.status}`);
  }

  const success = getTagValue(raw, "sikeres");
  const errorCode = getTagValue(raw, "hibakod");
  const errorMessage = getTagValue(raw, "hibauzenet");
  const invoiceNumber = getTagValue(raw, "szamlaszam");

  if (success !== "true") {
    throw new Error(
      `Számlázz.hu hiba${errorCode ? ` (${errorCode})` : ""}: ${
        errorMessage || "Ismeretlen számlázási hiba."
      }`
    );
  }

  return {
    invoiceNumber,
    rawResponse: raw,
  };
}