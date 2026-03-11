import fs from "fs";
import path from "path";

const inputPath = path.join(process.cwd(), "varosok-varmegyek.csv");
const outputPath = path.join(process.cwd(), "data", "hungary-settlements.json");

const raw = fs.readFileSync(inputPath, "utf8");

const lines = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const dataLines = lines.slice(1);

const items = dataLines
  .map((line) => {
    const parts = line.split(";");

    if (parts.length < 2) return null;

    const city = parts[0]?.trim();
    const county = parts[1]?.trim();

    if (!city || !county) return null;

    return { city, county };
  })
  .filter(Boolean);

const unique = [];
const seen = new Set();

for (const item of items) {
  const key = `${item.county}__${item.city}`;

  if (!seen.has(key)) {
    seen.add(key);
    unique.push(item);
  }
}

unique.sort((a, b) => {
  if (a.county === b.county) {
    return a.city.localeCompare(b.city, "hu");
  }

  return a.county.localeCompare(b.county, "hu");
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf8");

console.log(`Kész: ${unique.length} település mentve ide: ${outputPath}`);