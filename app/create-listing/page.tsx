"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";
import settlements from "@/data/hungary-settlements.json";
import { HUNGARIAN_COUNTIES, DELIVERY_MODES } from "@/lib/hungary";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
};

type SettlementItem = {
  city: string;
  county: string;
};

const settlementItems = settlements as SettlementItem[];

export default function CreateListingPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("1000");
  const [durationHours, setDurationHours] = useState("24");
  const [minIncrement, setMinIncrement] = useState("100");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");

  const [catsL1, setCatsL1] = useState<Category[]>([]);
  const [catsL2, setCatsL2] = useState<Category[]>([]);
  const [catsL3, setCatsL3] = useState<Category[]>([]);

  const [catL1, setCatL1] = useState("");
  const [catL2, setCatL2] = useState("");
  const [catL3, setCatL3] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const finalCategoryId = useMemo(() => catL3 || catL2 || catL1 || "", [catL1, catL2, catL3]);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState("");

  const availableCities = useMemo(() => {
    if (!county) return [];
    return settlementItems
      .filter((item) => item.county === county)
      .map((item) => item.city)
      .sort((a, b) => a.localeCompare(b, "hu"));
  }, [county]);

  function safeFileName(name: string) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
  }

  async function loadLevel1() {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error(`Kategóriák betöltése sikertelen: ${error.message}`);
      return;
    }

    setCatsL1((data ?? []) as Category[]);
  }

  async function loadChildren(parentId: string) {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,parent_id,sort_order")
      .eq("parent_id", parentId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return [];
    return (data ?? []) as Category[];
  }

  useEffect(() => {
    loadLevel1();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function run() {
      setCatsL2([]);
      setCatsL3([]);
      setCatL2("");
      setCatL3("");

      if (!catL1) return;

      const children = await loadChildren(catL1);
      setCatsL2(children);
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catL1]);

  useEffect(() => {
    async function run() {
      setCatsL3([]);
      setCatL3("");

      if (!catL2) return;

      const children = await loadChildren(catL2);
      setCatsL3(children);
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catL2]);

  useEffect(() => {
    setCity("");
  }, [county]);

  const sp = useMemo(() => Number(startingPrice), [startingPrice]);
  const inc = useMemo(() => Number(minIncrement), [minIncrement]);
  const hours = useMemo(() => Number(durationHours), [durationHours]);
  const buyNow = useMemo(() => {
    if (!buyNowPrice.trim()) return null;
    const n = Number(buyNowPrice);
    return Number.isFinite(n) ? n : NaN;
  }, [buyNowPrice]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!county) return false;
    if (!city) return false;
    if (!deliveryMode) return false;
    if (!Number.isFinite(sp) || sp <= 0) return false;
    if (!Number.isFinite(inc) || inc <= 0) return false;
    if (!Number.isFinite(hours) || hours <= 0) return false;
    if (buyNow !== null && (!Number.isFinite(buyNow) || buyNow <= 0 || buyNow <= sp)) return false;
    return true;
  }, [title, county, city, deliveryMode, sp, inc, hours, buyNow]);
  async function suggestCategoryWithAI() {
  if (aiLoading) return;

  if (!title.trim() && !description.trim()) {
    toast.error("Adj meg legalább címet vagy leírást az AI ajánláshoz.");
    return;
  }

  setAiLoading(true);
  setAiReason("");

  try {
    const res = await fetch("/api/ai/category-suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      toast.error(data?.error || "Nem sikerült AI kategóriaajánlást kérni.");
      return;
    }

    const suggestion = data?.suggestion;

    if (!suggestion?.l1Id || !suggestion?.l2Id || !suggestion?.l3Id) {
      toast.error("Az AI nem adott használható kategóriaajánlást.");
      return;
    }

    setCatL1(suggestion.l1Id);
    setCatL2(suggestion.l2Id);
    setCatL3(suggestion.l3Id);
    setAiReason(suggestion.reason || "");

    toast.success("AI kategóriaajánlás alkalmazva.");
  } finally {
    setAiLoading(false);
  }
}
async function fillFromImageWithAI() {
  if (aiImageLoading) return;

  if (!files || files.length === 0) {
    toast.error("Előbb válassz ki legalább egy képet.");
    return;
  }

  setAiImageLoading(true);

  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;

    if (!uid) {
      toast.error("Előbb jelentkezz be.");
      return;
    }

    const firstFile = files[0];
    const safeName = safeFileName(firstFile.name);
    const tempPath = `ai-temp/${uid}_${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(tempPath, firstFile, { upsert: false });

    if (uploadError) {
      toast.error(`AI előkészítés feltöltési hiba: ${uploadError.message}`);
      return;
    }

    const { data: pub } = supabase.storage
      .from("listing-images")
      .getPublicUrl(tempPath);

    const imageUrl = pub.publicUrl;

    const res = await fetch("/api/ai/image-listing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      toast.error(data?.error || "Nem sikerült AI képelemzést kérni.");
      return;
    }

    const result = data?.result;

    if (!result) {
      toast.error("Az AI nem adott használható választ.");
      return;
    }

    if (result.title && !title.trim()) {
      setTitle(result.title);
    }

    if (result.description && !description.trim()) {
      setDescription(result.description);
    }

    toast.success("AI képalapú kitöltés elkészült.");

    // opcionális következő lépés:
    // ha már van title/description, kérjünk automatikusan kategóriaajánlást is
    // ezt most még nem futtatjuk automatikusan, nehogy túl sok AI hívás legyen
  } finally {
    setAiImageLoading(false);
  }
}
  async function createListing() {
    if (submitting) return;

    if (!title.trim()) return toast.error("Adj címet.");
    if (!county) return toast.error("Válassz vármegyét.");
    if (!city) return toast.error("Válassz települést.");
    if (!deliveryMode) return toast.error("Válassz átvételi módot.");
    if (!Number.isFinite(sp) || sp <= 0) return toast.error("A kezdőár legyen 0-nál nagyobb.");
    if (!Number.isFinite(inc) || inc <= 0) return toast.error("A licitlépcső legyen 0-nál nagyobb.");
    if (!Number.isFinite(hours) || hours <= 0) return toast.error("Az időtartam legyen 0-nál nagyobb.");

    if (buyNow !== null) {
      if (!Number.isFinite(buyNow) || buyNow <= 0) {
        return toast.error("A villámár legyen pozitív szám.");
      }
      if (buyNow <= sp) {
        return toast.error("A villámár legyen magasabb, mint a kezdőár.");
      }
    }

    setSubmitting(true);

    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;

      if (!uid) {
        toast.error("Előbb jelentkezz be.");
        setSubmitting(false);
        return;
      }

      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { data: created, error: createErr } = await supabase
        .from("listings")
        .insert({
          user_id: uid,
          category_id: finalCategoryId || null,
          title: title.trim(),
          description: description.trim() || null,
          starting_price: sp,
          current_price: sp,
          min_increment: inc,
          ends_at: endsAt,
          is_active: true,
          county,
          city,
          delivery_mode: deliveryMode,
          buy_now_price: buyNow,
        })
        .select("id")
        .single();

      if (createErr) {
        toast.error(createErr.message);
        setSubmitting(false);
        return;
      }

      const listingId = created.id as string;

      const uploadedUrls: string[] = [];
      const uploadedPaths: string[] = [];

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const safeName = safeFileName(f.name);
          const path = `${uid}/${listingId}_${Date.now()}_${safeName}`;

          const { error: upErr } = await supabase.storage
            .from("listing-images")
            .upload(path, f, { upsert: false });

          if (upErr) {
            toast.error(`Feltöltési hiba: ${upErr.message}`);
            setSubmitting(false);
            return;
          }

          uploadedPaths.push(path);
          const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
          uploadedUrls.push(pub.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const { error: updErr } = await supabase
          .from("listings")
          .update({ image_urls: uploadedUrls, image_paths: uploadedPaths })
          .eq("id", listingId);

        if (updErr) {
          toast.error(updErr.message);
          setSubmitting(false);
          return;
        }
      }

      toast.success("Aukció létrehozva ✅");

      setTitle("");
      setDescription("");
      setStartingPrice("1000");
      setDurationHours("24");
      setMinIncrement("100");
      setBuyNowPrice("");
      setFiles(null);

      setCounty("");
      setCity("");
      setDeliveryMode("");

      setCatL1("");
      setCatL2("");
      setCatL3("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.85),rgba(255,255,255,0.96),rgba(245,208,254,0.72))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
              Eladás
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Aukció létrehozása
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Add meg a termék adatait, válassz helyszínt és átvételi módot, majd indítsd el az aukciót modern, prémium felületen.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Gyors feladás
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Villámár opcionális
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Magyar helyadatok
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle>Termék és aukció adatai</CardTitle>
              <CardDescription>
                Add meg az alapadatokat, tölts fel képeket, és indíthatod is.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Cím</Label>
                <Input
                  id="title"
                  placeholder="Pl.: iPhone 13, 128GB, hibátlan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Legyen rövid és beszédes. A jó cím több licitet hoz.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Leírás</Label>
                <Textarea
                  id="desc"
                  placeholder="Írd le az állapotot, tartozékokat, átvételt, stb."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[140px] rounded-xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kezdőár</Label>
                  <Input
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    inputMode="decimal"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Licitlépcső</Label>
                  <Input
                    value={minIncrement}
                    onChange={(e) => setMinIncrement(e.target.value)}
                    inputMode="decimal"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Időtartam (óra)</Label>
                  <Input
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    inputMode="numeric"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Villámár (opcionális)</Label>
                  <Input
                    value={buyNowPrice}
                    onChange={(e) => setBuyNowPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="Pl. 35000"
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ha megadod, a vevő azonnal lezárhatja vele az aukciót.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
  <Label>Képek</Label>
  <Input
    type="file"
    multiple
    accept="image/*"
    onChange={(e) => setFiles(e.target.files)}
    className="h-12 rounded-xl"
  />

  <p className="text-xs text-muted-foreground">
    Tipp: 3–6 kép ideális, jó fényben, több szögből.
  </p>

  <Button
    type="button"
    variant="outline"
    className="rounded-xl"
    onClick={fillFromImageWithAI}
    disabled={aiImageLoading || !files || files.length === 0}
  >
    {aiImageLoading ? "AI elemzés folyamatban..." : "✨ AI kitöltés képből"}
  </Button>

  <p className="text-xs text-muted-foreground">
    Az AI megpróbál címet és leírást javasolni az első feltöltött kép alapján.
  </p>
</div>

                <div className="space-y-2">
                  <Label>Átvételi mód</Label>
                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value)}
                  >
                    <option value="">Válassz átvételi módot</option>
                    {DELIVERY_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vármegye</Label>
                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                  >
                    <option value="">Válassz vármegyét</option>
                    {HUNGARIAN_COUNTIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Település</Label>
                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!county}
                  >
                    <option value="">{county ? "Válassz települést" : "Előbb válassz vármegyét"}</option>
                    {availableCities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kategória</Label>
                <div className="flex flex-wrap gap-2">
  <Button
    type="button"
    variant="outline"
    className="rounded-xl"
    onClick={suggestCategoryWithAI}
    disabled={aiLoading}
  >
    {aiLoading ? "AI elemzés..." : "✨ AI kategóriaajánlás"}
  </Button>
</div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                    value={catL1}
                    onChange={(e) => setCatL1(e.target.value)}
                  >
                    <option value="">Főkategória</option>
                    {catsL1.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    value={catL2}
                    onChange={(e) => setCatL2(e.target.value)}
                    disabled={!catL1 || catsL2.length === 0}
                  >
                    <option value="">Alkategória</option>
                    {catsL2.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    value={catL3}
                    onChange={(e) => setCatL3(e.target.value)}
                    disabled={!catL2 || catsL3.length === 0}
                  >
                    <option value="">Típus</option>
                    {catsL3.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {finalCategoryId ? (
                  <div className="text-xs text-muted-foreground">
                    Kiválasztva:{" "}
                    <span className="font-medium text-foreground">
                      {catL3
                        ? catsL3.find((x) => x.id === catL3)?.name
                        : catL2
                        ? catsL2.find((x) => x.id === catL2)?.name
                        : catsL1.find((x) => x.id === catL1)?.name}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Nem kötelező, de ajánlott.</div>
                )}
                {aiReason ? (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
    <span className="font-medium text-slate-900">AI javaslat indoka:</span> {aiReason}
  </div>
) : null}
              </div>

              <Button
                className="h-12 w-full rounded-xl"
                onClick={createListing}
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Létrehozás folyamatban…" : "Aukció indítása"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_16px_40px_rgba(15,23,42,0.06)] lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base">Összefoglaló</CardTitle>
              <CardDescription>
                Így fog megjelenni nagyjából a licitdoboz logikája.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Kezdőár</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {Number.isFinite(sp) ? formatHuf(sp) : "-"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Licitlépcső</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {Number.isFinite(inc) ? formatHuf(inc) : "-"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Időtartam</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {Number.isFinite(hours) ? `${hours} óra` : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Következő minimum</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {Number.isFinite(sp) && Number.isFinite(inc) ? formatHuf(sp + inc) : "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Villámár</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {buyNow !== null && Number.isFinite(buyNow) ? formatHuf(buyNow) : "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Helyszín</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {county && city ? `${county} · ${city}` : "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Átvételi mód</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {deliveryMode
                    ? DELIVERY_MODES.find((x) => x.value === deliveryMode)?.label ?? deliveryMode
                    : "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl border p-4 text-xs text-muted-foreground">
                <div className="mb-2 font-medium text-foreground">Tippek</div>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Legyen jó a fő kép — ez adja az első benyomást.</li>
                  <li>Írj pontos átvételi információkat.</li>
                  <li>Ne legyen túl kicsi a licitlépcső.</li>
                  <li>A villámár segíthet gyorsabban lezárni az aukciót.</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Gyors</Badge>
                <Badge variant="secondary">Átlátható</Badge>
                <Badge variant="secondary">Modern</Badge>
                <Badge variant="secondary">Villámár</Badge>
              </div>

              <Button variant="outline" className="h-11 w-full rounded-xl" asChild>
                <a href="/listings">Vissza a listára</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}