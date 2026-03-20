function escapeXml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function createSzamlazzHuInvoice({
  name,
  email,
  amount,
  description,
}: {
  name: string;
  email: string;
  amount: number;
  description: string;
}) {
  const agentKey = process.env.SZAMLAZZHU_AGENT_KEY;
  const isTest = process.env.SZAMLAZZHU_TEST_MODE === "true";

  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla>
  <beallitasok>
    <szamlaagentkulcs>${agentKey}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <emailKuldes>true</emailKuldes>
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
    <email>${escapeXml(email)}</email>
  </vevo>

  <tetelek>
    <tetel>
      <megnevezes>${escapeXml(description)}</megnevezes>
      <mennyiseg>1</mennyiseg>
      <mennyisegiEgyseg>db</mennyisegiEgyseg>
      <nettoEgysegar>${amount}</nettoEgysegar>
      <afakulcs>AAM</afakulcs>
    </tetel>
  </tetelek>
</xmlszamla>`;

  const res = await fetch("https://www.szamlazz.hu/szamla/", {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
    },
    body: xml,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("SZAMLAZZ ERROR:", text);
    throw new Error("Számlázás sikertelen");
  }

  return await res.arrayBuffer();
}