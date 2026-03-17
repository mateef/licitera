export type CategoryNode = {
  name: string;
  children?: CategoryNode[];
};

export const CATEGORY_TREE: CategoryNode[] = [
  {
    name: "Elektronika",
    children: [
      {
        name: "Telefon",
        children: [
          { name: "iPhone" },
          { name: "Samsung" },
          { name: "Xiaomi" },
          { name: "Huawei" },
          { name: "Honor" },
          { name: "OnePlus" },
          { name: "Google Pixel" },
          { name: "Nokia" },
          { name: "Egyéb okostelefon" },
          { name: "Nyomógombos telefon" },
        ],
      },
      {
        name: "Tablet",
        children: [
          { name: "iPad" },
          { name: "Samsung tablet" },
          { name: "Lenovo tablet" },
          { name: "Huawei tablet" },
          { name: "Xiaomi tablet" },
          { name: "Egyéb tablet" },
        ],
      },
      {
        name: "Okosóra és karkötő",
        children: [
          { name: "Apple Watch" },
          { name: "Samsung Galaxy Watch" },
          { name: "Garmin" },
          { name: "Huawei Watch" },
          { name: "Xiaomi Smart Band" },
          { name: "Egyéb okosóra" },
        ],
      },
      {
        name: "Laptop",
        children: [
          { name: "MacBook" },
          { name: "Gaming laptop" },
          { name: "Ultrabook" },
          { name: "Business laptop" },
          { name: "2 az 1-ben laptop" },
          { name: "Chromebook" },
        ],
      },
      {
        name: "Asztali számítógép",
        children: [
          { name: "PC konfiguráció" },
          { name: "Mini PC" },
          { name: "All-in-one PC" },
          { name: "iMac" },
        ],
      },
      {
        name: "PC alkatrész",
        children: [
          { name: "Videókártya" },
          { name: "Processzor" },
          { name: "Alaplap" },
          { name: "RAM" },
          { name: "SSD" },
          { name: "HDD" },
          { name: "Tápegység" },
          { name: "Számítógépház" },
          { name: "Hűtés" },
        ],
      },
      {
        name: "Monitor",
        children: [
          { name: "Gaming monitor" },
          { name: "Irodai monitor" },
          { name: "Ultrawide monitor" },
          { name: "4K monitor" },
        ],
      },
      {
        name: "TV és projektor",
        children: [
          { name: "LED TV" },
          { name: "OLED TV" },
          { name: "QLED TV" },
          { name: "Projektor" },
          { name: "Vetítővászon" },
        ],
      },
      {
        name: "Játékkonzol",
        children: [
          { name: "PlayStation" },
          { name: "Xbox" },
          { name: "Nintendo" },
          { name: "Steam Deck" },
          { name: "Retro konzol" },
        ],
      },
      {
        name: "Konzol játék",
        children: [
          { name: "PlayStation játék" },
          { name: "Xbox játék" },
          { name: "Nintendo játék" },
        ],
      },
      {
        name: "PC gaming",
        children: [
          { name: "Gamer periféria" },
          { name: "Gaming szék" },
          { name: "VR headset" },
        ],
      },
      {
        name: "Audio",
        children: [
          { name: "Fülhallgató" },
          { name: "Fejhallgató" },
          { name: "Bluetooth hangszóró" },
          { name: "Soundbar" },
          { name: "Hi-fi" },
          { name: "Mikrofon" },
        ],
      },
      {
        name: "Kamera és fotó",
        children: [
          { name: "DSLR" },
          { name: "Tükör nélküli fényképező" },
          { name: "Objektív" },
          { name: "Akciókamera" },
          { name: "Drón" },
          { name: "Tripod" },
        ],
      },
      {
        name: "Hálózat és irodatechnika",
        children: [
          { name: "Router" },
          { name: "Switch" },
          { name: "Nyomtató" },
          { name: "Szkenner" },
          { name: "Projektor kiegészítő" },
        ],
      },
      {
        name: "Kábel és tartozék",
        children: [
          { name: "Töltő" },
          { name: "Powerbank" },
          { name: "Tok" },
          { name: "Kábel" },
          { name: "Adapter" },
          { name: "Memóriakártya" },
        ],
      },
    ],
  },
  {
    name: "Otthon és kert",
    children: [
      {
        name: "Bútor",
        children: [
          { name: "Kanapé" },
          { name: "Ágy" },
          { name: "Matrac" },
          { name: "Ruhásszekrény" },
          { name: "Komód" },
          { name: "Asztal" },
          { name: "Szék" },
          { name: "Polc" },
          { name: "Irodabútor" },
        ],
      },
      {
        name: "Lakberendezés",
        children: [
          { name: "Tükör" },
          { name: "Szőnyeg" },
          { name: "Lámpa" },
          { name: "Kép és dekor" },
          { name: "Függöny" },
          { name: "Díszpárna" },
        ],
      },
      {
        name: "Konyha",
        children: [
          { name: "Edény" },
          { name: "Serpenyő" },
          { name: "Evőeszköz" },
          { name: "Tányér" },
          { name: "Kávéfőző" },
          { name: "Mikrohullámú sütő" },
          { name: "Turmixgép" },
          { name: "Konyhai robotgép" },
        ],
      },
      {
        name: "Háztartási gép",
        children: [
          { name: "Hűtő" },
          { name: "Fagyasztó" },
          { name: "Mosógép" },
          { name: "Szárítógép" },
          { name: "Mosogatógép" },
          { name: "Porszívó" },
          { name: "Klíma" },
        ],
      },
      {
        name: "Takarítás",
        children: [
          { name: "Porszívó" },
          { name: "Robotporszívó" },
          { name: "Gőztisztító" },
          { name: "Tisztítógép" },
        ],
      },
      {
        name: "Barkácseszköz",
        children: [
          { name: "Fúró" },
          { name: "Csavarozó" },
          { name: "Flex" },
          { name: "Fűrész" },
          { name: "Kompresszor" },
          { name: "Hegesztő" },
          { name: "Kéziszerszám" },
          { name: "Szerszámkészlet" },
        ],
      },
      {
        name: "Kert",
        children: [
          { name: "Fűnyíró" },
          { name: "Fűkasza" },
          { name: "Láncfűrész" },
          { name: "Kerti bútor" },
          { name: "Grill" },
          { name: "Medence" },
          { name: "Öntözés" },
          { name: "Növény és kaspó" },
        ],
      },
      {
        name: "Fürdőszoba",
        children: [
          { name: "Csaptelep" },
          { name: "Tükör" },
          { name: "Fürdőszobai bútor" },
        ],
      },
      {
        name: "Építőanyag",
        children: [
          { name: "Csempe" },
          { name: "Laminált padló" },
          { name: "Festék" },
          { name: "Szigetelés" },
        ],
      },
      {
        name: "Kisállat otthon",
        children: [
          { name: "Kutyafekhely" },
          { name: "Macskabútor" },
          { name: "Ketrec" },
          { name: "Akvárium" },
        ],
      },
    ],
  },
  {
    name: "Divat és kiegészítők",
    children: [
      {
        name: "Női ruházat",
        children: [
          { name: "Kabát" },
          { name: "Pulóver" },
          { name: "Ruha" },
          { name: "Felső" },
          { name: "Nadrág" },
          { name: "Szoknya" },
          { name: "Farmer" },
          { name: "Sportruházat" },
        ],
      },
      {
        name: "Férfi ruházat",
        children: [
          { name: "Kabát" },
          { name: "Póló" },
          { name: "Ing" },
          { name: "Pulóver" },
          { name: "Nadrág" },
          { name: "Farmer" },
          { name: "Öltöny" },
          { name: "Sportruházat" },
        ],
      },
      {
        name: "Cipő",
        children: [
          { name: "Sneaker" },
          { name: "Futócipő" },
          { name: "Bakancs" },
          { name: "Szandál" },
          { name: "Magassarkú" },
          { name: "Papucs" },
          { name: "Munkavédelmi cipő" },
        ],
      },
      {
        name: "Táska",
        children: [
          { name: "Hátizsák" },
          { name: "Kézitáska" },
          { name: "Bőrönd" },
          { name: "Övtáska" },
          { name: "Laptop táska" },
        ],
      },
      {
        name: "Ékszer",
        children: [
          { name: "Gyűrű" },
          { name: "Nyaklánc" },
          { name: "Fülbevaló" },
          { name: "Karkötő" },
          { name: "Óra" },
        ],
      },
      {
        name: "Kiegészítő",
        children: [
          { name: "Napszemüveg" },
          { name: "Sapka" },
          { name: "Sál" },
          { name: "Öv" },
          { name: "Pénztárca" },
        ],
      },
    ],
  },
  {
    name: "Gyerek és baba",
    children: [
      {
        name: "Babafelszerelés",
        children: [
          { name: "Babakocsi" },
          { name: "Autósülés" },
          { name: "Kiságy" },
          { name: "Etetőszék" },
        ],
      },
      {
        name: "Baba és gyerek ruha",
        children: [
          { name: "Body" },
          { name: "Kabát" },
          { name: "Cipő" },
          { name: "Egyéb ruházat" },
        ],
      },
      {
        name: "Játék",
        children: [
          { name: "Plüss" },
          { name: "Építőjáték" },
          { name: "Fejlesztő játék" },
          { name: "Társasjáték" },
          { name: "Távirányítós játék" },
        ],
      },
      {
        name: "Iskolai felszerelés",
        children: [
          { name: "Iskolatáska" },
          { name: "Tolltartó" },
          { name: "Írószer" },
        ],
      },
      {
        name: "Gyerekbútor",
        children: [
          { name: "Gyerekágy" },
          { name: "Íróasztal" },
          { name: "Tároló" },
        ],
      },
    ],
  },
  {
    name: "Sport és szabadidő",
    children: [
      {
        name: "Kerékpár",
        children: [
          { name: "Országúti kerékpár" },
          { name: "MTB" },
          { name: "Városi kerékpár" },
          { name: "Elektromos kerékpár" },
          { name: "Gyerekbicikli" },
        ],
      },
      {
        name: "Roller",
        children: [
          { name: "Elektromos roller" },
          { name: "Hagyományos roller" },
        ],
      },
      {
        name: "Fitness",
        children: [
          { name: "Súlyzó" },
          { name: "Futópad" },
          { name: "Szobakerékpár" },
          { name: "Jóga felszerelés" },
        ],
      },
      {
        name: "Outdoor",
        children: [
          { name: "Sátor" },
          { name: "Hálózsák" },
          { name: "Hátizsák" },
          { name: "Túrafelszerelés" },
        ],
      },
      {
        name: "Téli sport",
        children: [
          { name: "Síléc" },
          { name: "Snowboard" },
          { name: "Sícipő" },
          { name: "Síkabát" },
        ],
      },
      {
        name: "Labdasport",
        children: [
          { name: "Futball" },
          { name: "Kosárlabda" },
          { name: "Tenisz" },
          { name: "Pingpong" },
        ],
      },
      {
        name: "Egyéb sport",
        children: [
          { name: "Horgászat" },
          { name: "Vadászat" },
          { name: "Küzdősport" },
          { name: "Lovaglás" },
        ],
      },
    ],
  },
  {
    name: "Jármű és alkatrész",
    children: [
      {
        name: "Autó alkatrész",
        children: [
          { name: "Felni" },
          { name: "Gumiabroncs" },
          { name: "Akkumulátor" },
          { name: "Lámpa" },
          { name: "Tükör" },
          { name: "Fékalkatrész" },
          { name: "Kipufogó" },
        ],
      },
      {
        name: "Autó kiegészítő",
        children: [
          { name: "Tetőbox" },
          { name: "Üléshuzat" },
          { name: "Telefontartó" },
          { name: "Menetrögzítő kamera" },
        ],
      },
      {
        name: "Motor és robogó",
        children: [
          { name: "Robogó" },
          { name: "Motoros ruha" },
          { name: "Bukósisak" },
          { name: "Motoralkatrész" },
        ],
      },
      {
        name: "Kerékpár alkatrész",
        children: [
          { name: "Kerék" },
          { name: "Fék" },
          { name: "Nyereg" },
          { name: "Váz" },
        ],
      },
      {
        name: "Szerszám és diagnosztika",
        children: [
          { name: "Emelő" },
          { name: "Diagnosztikai eszköz" },
          { name: "Akkutöltő" },
        ],
      },
    ],
  },
  {
    name: "Hobbi, játék, gyűjtés",
    children: [
      {
        name: "Könyv",
        children: [
          { name: "Regény" },
          { name: "Szakkönyv" },
          { name: "Tankönyv" },
          { name: "Gyerekkönyv" },
        ],
      },
      {
        name: "Játék és gyűjtés",
        children: [
          { name: "Társasjáték" },
          { name: "Puzzle" },
          { name: "LEGO" },
          { name: "Makett" },
          { name: "Vasútmodell" },
          { name: "Érme" },
          { name: "Bankjegy" },
          { name: "Bélyeg" },
          { name: "Kártya" },
          { name: "Képregény" },
        ],
      },
      {
        name: "Hangszer",
        children: [
          { name: "Gitár" },
          { name: "Zongora" },
          { name: "Szintetizátor" },
          { name: "Dob" },
          { name: "Hangszer tartozék" },
        ],
      },
      {
        name: "Művészet és alkotás",
        children: [
          { name: "Festék" },
          { name: "Ecset" },
          { name: "Vászon" },
          { name: "Kreatív hobbi" },
        ],
      },
    ],
  },
  {
    name: "Szépség és egészség",
    children: [
      {
        name: "Hajápolás",
        children: [
          { name: "Hajszárító" },
          { name: "Hajvasaló" },
          { name: "Hajformázó" },
        ],
      },
      {
        name: "Szépségápolás",
        children: [
          { name: "Bőrápolás" },
          { name: "Smink" },
          { name: "Parfüm" },
        ],
      },
      {
        name: "Elektromos szépségápolás",
        children: [
          { name: "Borotva" },
          { name: "Epilátor" },
          { name: "Arctisztító" },
        ],
      },
      {
        name: "Egészségügyi eszköz",
        children: [
          { name: "Vérnyomásmérő" },
          { name: "Masszírozó" },
          { name: "Gyógyászati segédeszköz" },
        ],
      },
    ],
  },
  {
    name: "Iroda és üzlet",
    children: [
      {
        name: "Irodai felszerelés",
        children: [
          { name: "Irodabútor" },
          { name: "Irodaszer" },
          { name: "Nyomtató" },
          { name: "Szkenner" },
        ],
      },
      {
        name: "Üzleti eszköz",
        children: [
          { name: "Pénztárgép" },
          { name: "Vonalkód olvasó" },
          { name: "Polcrendszer" },
          { name: "Csomagolástechnika" },
          { name: "Vendéglátó eszköz" },
          { name: "Üzleti technika" },
        ],
      },
    ],
  },
  {
    name: "Mezőgazdaság és ipar",
    children: [
      {
        name: "Mezőgazdaság",
        children: [
          { name: "Kerti gép" },
          { name: "Mezőgazdasági eszköz" },
          { name: "Takarmány tárolás" },
        ],
      },
      {
        name: "Ipar és műhely",
        children: [
          { name: "Műhelyfelszerelés" },
          { name: "Ipari gép" },
          { name: "Munkavédelem" },
        ],
      },
    ],
  },
];