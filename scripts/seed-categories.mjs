import { createClient } from "@supabase/supabase-js";
import process from "process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
        name: "Telefon",
        children: [
          "iPhone",
          "Samsung",
          "Xiaomi",
          "Huawei",
          "Honor",
          "OnePlus",
          "Google Pixel",
          "Nokia",
          "Egyéb okostelefon",
          "Nyomógombos telefon",
        ],
      },
      {
        name: "Tablet",
        children: [
          "iPad",
          "Samsung tablet",
          "Lenovo tablet",
          "Huawei tablet",
          "Xiaomi tablet",
          "Egyéb tablet",
        ],
      },
      {
        name: "Okosóra és karkötő",
        children: [
          "Apple Watch",
          "Samsung Galaxy Watch",
          "Garmin",
          "Huawei Watch",
          "Xiaomi Smart Band",
          "Egyéb okosóra",
        ],
      },
      {
        name: "Laptop",
        children: [
          "MacBook",
          "Gaming laptop",
          "Ultrabook",
          "Business laptop",
          "2 az 1-ben laptop",
          "Chromebook",
        ],
      },
      {
        name: "Asztali számítógép",
        children: ["PC konfiguráció", "Mini PC", "All-in-one PC", "iMac"],
      },
      {
        name: "PC alkatrész",
        children: [
          "Videókártya",
          "Processzor",
          "Alaplap",
          "RAM",
          "SSD",
          "HDD",
          "Tápegység",
          "Számítógépház",
          "Hűtés",
        ],
      },
      {
        name: "Monitor",
        children: ["Gaming monitor", "Irodai monitor", "Ultrawide monitor", "4K monitor"],
      },
      {
        name: "TV és projektor",
        children: ["LED TV", "OLED TV", "QLED TV", "Projektor", "Vetítővászon"],
      },
      {
        name: "Játékkonzol",
        children: ["PlayStation", "Xbox", "Nintendo", "Steam Deck", "Retro konzol"],
      },
      {
        name: "Konzol játék",
        children: ["PlayStation játék", "Xbox játék", "Nintendo játék"],
      },
      {
        name: "PC gaming",
        children: ["Gamer periféria", "Gaming szék", "VR headset"],
      },
      {
        name: "Audio",
        children: [
          "Fülhallgató",
          "Fejhallgató",
          "Bluetooth hangszóró",
          "Soundbar",
          "Hi-fi",
          "Mikrofon",
        ],
      },
      {
        name: "Kamera és fotó",
        children: ["DSLR", "Tükör nélküli fényképező", "Objektív", "Akciókamera", "Drón", "Tripod"],
      },
      {
        name: "Hálózat és irodatechnika",
        children: ["Router", "Switch", "Nyomtató", "Szkenner", "Projektor kiegészítő"],
      },
      {
        name: "Kábel és tartozék",
        children: ["Töltő", "Powerbank", "Tok", "Kábel", "Adapter", "Memóriakártya"],
      },
    ],
  },
  {
    name: "Otthon és kert",
    children: [
      {
        name: "Bútor",
        children: ["Kanapé", "Ágy", "Matrac", "Ruhásszekrény", "Komód", "Asztal", "Szék", "Polc", "Irodabútor"],
      },
      {
        name: "Lakberendezés",
        children: ["Tükör", "Szőnyeg", "Lámpa", "Kép és dekor", "Függöny", "Díszpárna"],
      },
      {
        name: "Konyha",
        children: ["Edény", "Serpenyő", "Evőeszköz", "Tányér", "Kávéfőző", "Mikrohullámú sütő", "Turmixgép", "Konyhai robotgép"],
      },
      {
        name: "Háztartási gép",
        children: ["Hűtő", "Fagyasztó", "Mosógép", "Szárítógép", "Mosogatógép", "Porszívó", "Klíma"],
      },
      {
        name: "Takarítás",
        children: ["Porszívó", "Robotporszívó", "Gőztisztító", "Tisztítógép"],
      },
      {
        name: "Barkácseszköz",
        children: ["Fúró", "Csavarozó", "Flex", "Fűrész", "Kompresszor", "Hegesztő", "Kéziszerszám", "Szerszámkészlet"],
      },
      {
        name: "Kert",
        children: ["Fűnyíró", "Fűkasza", "Láncfűrész", "Kerti bútor", "Grill", "Medence", "Öntözés", "Növény és kaspó"],
      },
      {
        name: "Fürdőszoba",
        children: ["Csaptelep", "Tükör", "Fürdőszobai bútor"],
      },
      {
        name: "Építőanyag",
        children: ["Csempe", "Laminált padló", "Festék", "Szigetelés"],
      },
      {
        name: "Kisállat otthon",
        children: ["Kutyafekhely", "Macskabútor", "Ketrec", "Akvárium"],
      },
    ],
  },
  {
    name: "Divat és kiegészítők",
    children: [
      {
        name: "Női ruházat",
        children: ["Kabát", "Pulóver", "Ruha", "Felső", "Nadrág", "Szoknya", "Farmer", "Sportruházat"],
      },
      {
        name: "Férfi ruházat",
        children: ["Kabát", "Póló", "Ing", "Pulóver", "Nadrág", "Farmer", "Öltöny", "Sportruházat"],
      },
      {
        name: "Cipő",
        children: ["Sneaker", "Futócipő", "Bakancs", "Szandál", "Magassarkú", "Papucs", "Munkavédelmi cipő"],
      },
      {
        name: "Táska",
        children: ["Hátizsák", "Kézitáska", "Bőrönd", "Övtáska", "Laptop táska"],
      },
      {
        name: "Ékszer",
        children: ["Gyűrű", "Nyaklánc", "Fülbevaló", "Karkötő", "Óra"],
      },
      {
        name: "Kiegészítő",
        children: ["Napszemüveg", "Sapka", "Sál", "Öv", "Pénztárca"],
      },
    ],
  },
  {
    name: "Gyerek és baba",
    children: [
      {
        name: "Babafelszerelés",
        children: ["Babakocsi", "Autósülés", "Kiságy", "Etetőszék"],
      },
      {
        name: "Baba és gyerek ruha",
        children: ["Body", "Kabát", "Cipő", "Egyéb ruházat"],
      },
      {
        name: "Játék",
        children: ["Plüss", "Építőjáték", "Fejlesztő játék", "Társasjáték", "Távirányítós játék"],
      },
      {
        name: "Iskolai felszerelés",
        children: ["Iskolatáska", "Tolltartó", "Írószer"],
      },
      {
        name: "Gyerekbútor",
        children: ["Gyerekágy", "Íróasztal", "Tároló"],
      },
    ],
  },
  {
    name: "Sport és szabadidő",
    children: [
      {
        name: "Kerékpár",
        children: ["Országúti kerékpár", "MTB", "Városi kerékpár", "Elektromos kerékpár", "Gyerekbicikli"],
      },
      {
        name: "Roller",
        children: ["Elektromos roller", "Hagyományos roller"],
      },
      {
        name: "Fitness",
        children: ["Súlyzó", "Futópad", "Szobakerékpár", "Jóga felszerelés"],
      },
      {
        name: "Outdoor",
        children: ["Sátor", "Hálózsák", "Hátizsák", "Túrafelszerelés"],
      },
      {
        name: "Téli sport",
        children: ["Síléc", "Snowboard", "Sícipő", "Síkabát"],
      },
      {
        name: "Labdasport",
        children: ["Futball", "Kosárlabda", "Tenisz", "Pingpong"],
      },
      {
        name: "Egyéb sport",
        children: ["Horgászat", "Vadászat", "Küzdősport", "Lovaglás"],
      },
    ],
  },
  {
    name: "Jármű és alkatrész",
    children: [
      {
        name: "Autó alkatrész",
        children: ["Felni", "Gumiabroncs", "Akkumulátor", "Lámpa", "Tükör", "Fékalkatrész", "Kipufogó"],
      },
      {
        name: "Autó kiegészítő",
        children: ["Tetőbox", "Üléshuzat", "Telefontartó", "Menetrögzítő kamera"],
      },
      {
        name: "Motor és robogó",
        children: ["Robogó", "Motoros ruha", "Bukósisak", "Motoralkatrész"],
      },
      {
        name: "Kerékpár alkatrész",
        children: ["Kerék", "Fék", "Nyereg", "Váz"],
      },
      {
        name: "Szerszám és diagnosztika",
        children: ["Emelő", "Diagnosztikai eszköz", "Akkutöltő"],
      },
    ],
  },
  {
    name: "Hobbi, játék, gyűjtés",
    children: [
      {
        name: "Könyv",
        children: ["Regény", "Szakkönyv", "Tankönyv", "Gyerekkönyv"],
      },
      {
        name: "Játék és gyűjtés",
        children: ["Társasjáték", "Puzzle", "LEGO", "Makett", "Vasútmodell", "Érme", "Bankjegy", "Bélyeg", "Kártya", "Képregény"],
      },
      {
        name: "Hangszer",
        children: ["Gitár", "Zongora", "Szintetizátor", "Dob", "Hangszer tartozék"],
      },
      {
        name: "Művészet és alkotás",
        children: ["Festék", "Ecset", "Vászon", "Kreatív hobbi"],
      },
    ],
  },
  {
    name: "Szépség és egészség",
    children: [
      {
        name: "Hajápolás",
        children: ["Hajszárító", "Hajvasaló", "Hajformázó"],
      },
      {
        name: "Szépségápolás",
        children: ["Bőrápolás", "Smink", "Parfüm"],
      },
      {
        name: "Elektromos szépségápolás",
        children: ["Borotva", "Epilátor", "Arctisztító"],
      },
      {
        name: "Egészségügyi eszköz",
        children: ["Vérnyomásmérő", "Masszírozó", "Gyógyászati segédeszköz"],
      },
    ],
  },
  {
    name: "Iroda és üzlet",
    children: [
      {
        name: "Irodai felszerelés",
        children: ["Irodabútor", "Irodaszer", "Nyomtató", "Szkenner"],
      },
      {
        name: "Üzleti eszköz",
        children: ["Pénztárgép", "Vonalkód olvasó", "Polcrendszer", "Csomagolástechnika", "Vendéglátó eszköz", "Üzleti technika"],
      },
    ],
  },
  {
    name: "Mezőgazdaság és ipar",
    children: [
      {
        name: "Mezőgazdaság",
        children: ["Kerti gép", "Mezőgazdasági eszköz", "Takarmány tárolás"],
      },
      {
        name: "Ipar és műhely",
        children: ["Műhelyfelszerelés", "Ipari gép", "Munkavédelem"],
      },
    ],
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " es ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

async function upsertCategory({ name, parentId, sortOrder, level, slug }) {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({
        name,
        parent_id: parentId,
        sort_order: sortOrder,
        level,
        is_active: true,
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      parent_id: parentId,
      sort_order: sortOrder,
      level,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function main() {
  console.log("Kategóriák feltöltése indul...");

  for (let i = 0; i < CATEGORY_TREE.length; i++) {
    const level1 = CATEGORY_TREE[i];
    const l1Slug = slugify(level1.name);

    const l1Id = await upsertCategory({
      name: level1.name,
      parentId: null,
      sortOrder: i + 1,
      level: 1,
      slug: l1Slug,
    });
    console.log(`L1 kész: ${level1.name}`);

    for (let j = 0; j < level1.children.length; j++) {
      const level2 = level1.children[j];
      const l2Slug = `${l1Slug}-${slugify(level2.name)}`;

      const l2Id = await upsertCategory({
        name: level2.name,
        parentId: l1Id,
        sortOrder: j + 1,
        level: 2,
        slug: l2Slug,
      });
      console.log(`  L2 kész: ${level2.name}`);

      for (let k = 0; k < level2.children.length; k++) {
        const level3 = level2.children[k];
        const l3Slug = `${l2Slug}-${slugify(level3)}`;

        await upsertCategory({
          name: level3,
          parentId: l2Id,
          sortOrder: k + 1,
          level: 3,
          slug: l3Slug,
        });
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