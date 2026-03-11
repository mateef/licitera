import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import process from "process";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Hiányzik a NEXT_PUBLIC_SUPABASE_URL vagy a SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const CATEGORY_TREE = [
  {
    name: "Elektronika",
    children: [
      {
        name: "Mobiltelefonok",
        children: ["Okostelefon", "Nyomógombos telefon", "Tok / fólia / kiegészítő"],
      },
      {
        name: "Tablet / e-book",
        children: ["Tablet", "E-book olvasó", "Tablet kiegészítő"],
      },
      {
        name: "Számítógép / laptop",
        children: ["Laptop", "Asztali PC", "Monitor", "Billentyűzet / egér"],
      },
      {
        name: "Gamer / konzol",
        children: ["PlayStation", "Xbox", "Nintendo", "Játékok / kontrollerek"],
      },
      {
        name: "TV / audio / videó",
        children: ["Televízió", "Hangfal / soundbar", "Fejhallgató / fülhallgató"],
      },
      {
        name: "Kamera / fotó",
        children: ["Fényképezőgép", "Objektív", "Kamera kiegészítő"],
      },
      {
        name: "Okos eszközök",
        children: ["Okosóra", "Okosotthon", "GPS / drón"],
      },
    ],
  },
  {
    name: "Jármű",
    children: [
      {
        name: "Autó",
        children: ["Személyautó", "Autóalkatrész", "Autó kiegészítő"],
      },
      {
        name: "Motor",
        children: ["Motorkerékpár", "Motoralkatrész", "Motoros felszerelés"],
      },
      {
        name: "Kerékpár",
        children: ["Kerékpár", "Kerékpár alkatrész", "Kerékpáros felszerelés"],
      },
    ],
  },
  {
    name: "Otthon és kert",
    children: [
      {
        name: "Bútor",
        children: ["Nappali bútor", "Hálószoba bútor", "Kerti bútor"],
      },
      {
        name: "Háztartási gép",
        children: ["Konyhai gép", "Mosás / takarítás", "Kisgép"],
      },
      {
        name: "Lakberendezés",
        children: ["Dekoráció", "Világítás", "Szőnyeg / textil"],
      },
      {
        name: "Kert / barkács",
        children: ["Szerszám", "Kerti gép", "Barkács anyag"],
      },
    ],
  },
  {
    name: "Divat",
    children: [
      {
        name: "Női ruházat",
        children: ["Felső", "Nadrág / szoknya", "Kabát / dzseki"],
      },
      {
        name: "Férfi ruházat",
        children: ["Felső", "Nadrág", "Kabát / dzseki"],
      },
      {
        name: "Cipő",
        children: ["Női cipő", "Férfi cipő", "Sportcipő"],
      },
      {
        name: "Táska / kiegészítő",
        children: ["Táska", "Óra", "Ékszer / egyéb"],
      },
    ],
  },
  {
    name: "Gyerek és baba",
    children: [
      {
        name: "Baba felszerelés",
        children: ["Babakocsi", "Etetés", "Biztonság"],
      },
      {
        name: "Játék",
        children: ["Fejlesztő játék", "Plüss / figura", "Kültéri játék"],
      },
      {
        name: "Gyerek ruházat",
        children: ["Baba ruha", "Gyerek ruha", "Gyerek cipő"],
      },
    ],
  },
  {
    name: "Sport és szabadidő",
    children: [
      {
        name: "Fitnesz",
        children: ["Kondigép", "Súlyzó / kiegészítő", "Jóga / torna"],
      },
      {
        name: "Téli sport",
        children: ["Sí", "Snowboard", "Felszerelés"],
      },
      {
        name: "Outdoor",
        children: ["Túra / kemping", "Horgászat", "Vadászat"],
      },
      {
        name: "Csapatsport",
        children: ["Labdarúgás", "Kosárlabda", "Egyéb sportfelszerelés"],
      },
    ],
  },
  {
    name: "Hobbi és gyűjtés",
    children: [
      {
        name: "Játék / modell",
        children: ["LEGO", "Modell", "Társasjáték"],
      },
      {
        name: "Könyv / zene / film",
        children: ["Könyv", "Vinyl / CD", "Film"],
      },
      {
        name: "Gyűjtemény",
        children: ["Érme / bélyeg", "Relikvia", "Egyéb gyűjtői tárgy"],
      },
    ],
  },
  {
    name: "Szépség és egészség",
    children: [
      {
        name: "Szépségápolás",
        children: ["Smink", "Bőrápolás", "Hajápolás"],
      },
      {
        name: "Egészség",
        children: ["Egészségügyi eszköz", "Masszázs / wellness", "Egyéb"],
      },
    ],
  },
];

async function insertCategory(name, parentId, sortOrder) {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      parent_id: parentId,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function main() {
  console.log("Kategóriák feltöltése indul...");

  for (let i = 0; i < CATEGORY_TREE.length; i++) {
    const level1 = CATEGORY_TREE[i];
    const l1Id = await insertCategory(level1.name, null, i + 1);
    console.log(`L1 kész: ${level1.name}`);

    for (let j = 0; j < level1.children.length; j++) {
      const level2 = level1.children[j];
      const l2Id = await insertCategory(level2.name, l1Id, j + 1);
      console.log(`  L2 kész: ${level2.name}`);

      for (let k = 0; k < level2.children.length; k++) {
        const level3 = level2.children[k];
        await insertCategory(level3, l2Id, k + 1);
        console.log(`    L3 kész: ${level3}`);
      }
    }
  }

  console.log("Kategóriák feltöltése kész.");
}

main().catch((err) => {
  console.error("Hiba a seed során:");
  console.error(err);
  process.exit(1);
});