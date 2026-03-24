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
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ImageIcon,
  MapPin,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  level?: number;
  sort_order: number | null;
};

type SettlementItem = {
  city: string;
  county: string;
};

type CreatedListingRow = {
  id: string;
};

const settlementItems = settlements as SettlementItem[];

export default function CreateListingPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("1000");
  const [durationHours, setDurationHours] = useState("24");
  const [minIncrement, setMinIncrement] = useState("100");
  const [buyNowPrice, setBuyNowPrice] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);

  const [county, setCounty] = useState("");
  const [countyQuery, setCountyQuery] = useState("");
  const [city, setCity] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");

  const [catsL1, setCatsL1] = useState<Category[]>([]);
  const [catsL2, setCatsL2] = useState<Category[]>([]);
  const [catsL3, setCatsL3] = useState<Category[]>([]);

  const [catL1, setCatL1] = useState("");
  const [catL2, setCatL2] = useState("");
  const [catL3, setCatL3] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiReason, setAiReason] = useState("");

  const finalCategoryId = useMemo(
    () => catL3 || catL2 || catL1 || "",
    [catL1, catL2, catL3]
  );

  const sp = useMemo(() => Number(startingPrice), [startingPrice]);
  const inc = useMemo(() => Number(minIncrement), [minIncrement]);
  const hours = useMemo(() => Number(durationHours), [durationHours]);
  const buyNow = useMemo(() => {
    if (!buyNowPrice.trim()) return null;
    const n = Number(buyNowPrice);
    return Number.isFinite(n) ? n : NaN;
  }, [buyNowPrice]);

  const filteredCounties = useMemo(() => {
    const q = countyQuery.trim().toLocaleLowerCase("hu");
    const base = [...HUNGARIAN_COUNTIES].sort((a, b) =>
      a.localeCompare(b, "hu")
    );

    if (!q) return base.slice(0, 8);

    return base
      .filter((item) => item.toLocaleLowerCase("hu").includes(q))
      .slice(0, 8);
  }, [countyQuery]);

  const availableCities = useMemo(() => {
    if (!county) return [];

    return settlementItems
      .filter((item) => item.county === county)
      .map((item) => item.city)
      .sort((a, b) => a.localeCompare(b, "hu"));
  }, [county]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLocaleLowerCase("hu");

    if (!county) return [];
    if (!q) return availableCities.slice(0, 10);

    return availableCities
      .filter((item) => item.toLocaleLowerCase("hu").includes(q))
      .slice(0, 10);
  }, [availableCities, cityQuery, county]);

  const selectedCategoryLabel = useMemo(() => {
    if (catL3) return catsL3.find((x) => x.id === catL3)?.name ?? "";
    if (catL2) return catsL2.find((x) => x.id === catL2)?.name ?? "";
    if (catL1) return catsL1.find((x) => x.id === catL1)?.name ?? "";
    return "";
  }, [catL1, catL2, catL3, catsL1, catsL2, catsL3]);

  const featuredPreviewUrl = previewUrls[featuredImageIndex] ?? null;

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!county) return false;
    if (!city) return false;
    if (!deliveryMode) return false;
    if (!finalCategoryId) return false;
    if (!Number.isFinite(sp) || sp <= 0) return false;
    if (!Number.isFinite(inc) || inc <= 0) return false;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 72) return false;
    if (
      buyNow !== null &&
      (!Number.isFinite(buyNow) || buyNow <= 0 || buyNow <= sp)
    )
      return false;

    return true;
  }, [title, county, city, deliveryMode, finalCategoryId, sp, inc, hours, buyNow]);

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
      .select("id,name,parent_id,level,sort_order")
      .eq("level", 1)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error(`Kategóriák betöltése sikertelen: ${error.message}`);
      return;
    }

    setCatsL1((data ?? []) as Category[]);
  }

  async function loadChildren(parentId: string, level: 2 | 3) {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,parent_id,level,sort_order")
      .eq("parent_id", parentId)
      .eq("level", level)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return [];
    return (data ?? []) as Category[];
  }

  function handleFilesChange(fileList: FileList | null) {
    const nextFiles = fileList ? Array.from(fileList) : [];
    setFiles(nextFiles);
    setFeaturedImageIndex(0);

    setPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return nextFiles.map((file) => URL.createObjectURL(file));
    });
  }

  useEffect(() => {
    loadLevel1();
  }, []);

  useEffect(() => {
    async function run() {
      setCatsL2([]);
      setCatsL3([]);
      setCatL2("");
      setCatL3("");

      if (!catL1) return;

      const children = await loadChildren(catL1, 2);
      setCatsL2(children);
    }

    run();
  }, [catL1]);

  useEffect(() => {
    async function run() {
      setCatsL3([]);
      setCatL3("");

      if (!catL2) return;

      const children = await loadChildren(catL2, 3);
      setCatsL3(children);
    }

    run();
  }, [catL2]);

  useEffect(() => {
    setCity("");
    setCityQuery("");
  }, [county]);

  useEffect(() => {
    setCountyQuery(county);
  }, [county]);

  useEffect(() => {
    setCityQuery(city);
  }, [city]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  async function fillFromImageWithAI() {
    if (aiImageLoading) return;

    if (!files || files.length === 0) {
      toast.error("Előbb válassz ki legalább egy képet.");
      return;
    }

    setAiImageLoading(true);
    setAiReason("");

    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;

      if (!uid) {
        toast.error("Előbb jelentkezz be.");
        return;
      }

      const selectedFile = files[featuredImageIndex] ?? files[0];
      const safeName = safeFileName(selectedFile.name);
      const tempPath = `${uid}/ai-temp_${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(tempPath, selectedFile, { upsert: false });

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

      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.l1Id) setCatL1(result.l1Id);
      if (result.l2Id) setCatL2(result.l2Id);
      if (result.l3Id) setCatL3(result.l3Id);
      if (result.reason) setAiReason(result.reason);

      toast.success("AI kitöltés elkészült.");
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
    if (!finalCategoryId) return toast.error("Válassz kategóriát.");
    if (!Number.isFinite(sp) || sp <= 0)
      return toast.error("A kezdőár legyen 0-nál nagyobb.");
    if (!Number.isFinite(inc) || inc <= 0)
      return toast.error("A licitlépcső legyen 0-nál nagyobb.");

    if (!Number.isFinite(hours) || hours <= 0) {
      return toast.error("Az időtartam legyen 0-nál nagyobb.");
    }

    if (hours > 72) {
      return toast.error("Az aukció maximális időtartama 72 óra lehet.");
    }

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
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", uid)
        .maybeSingle();

      if (profileError) {
        toast.error("Nem sikerült ellenőrizni a profiladataidat.");
        return;
      }

      const phone = (profile as { phone?: string | null } | null)?.phone?.trim();

      if (!phone) {
        toast.error("Aukció indításához előbb add meg a telefonszámod a profilodban.");
        return;
      }

      const { data: balanceRow, error: balanceError } = await supabase
        .from("billing_user_balances")
        .select("balance_amount")
        .eq("user_id", uid)
        .maybeSingle();

      if (balanceError) {
        toast.error("Nem sikerült ellenőrizni az egyenlegedet.");
        return;
      }

      const balanceAmount = Number(
        (balanceRow as { balance_amount?: number } | null)?.balance_amount ?? 0
      );

      if (balanceAmount < -175) {
        toast.error(
          `Az egyenleged túl alacsony (${new Intl.NumberFormat("hu-HU").format(
            balanceAmount
          )} Ft), ezért új aukciót most nem tudsz indítani.`
        );
        return;
      }

      const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { data: created, error: createErr } = await supabase.rpc(
        "create_listing_with_quota",
        {
          p_category_id: finalCategoryId || null,
          p_title: title.trim(),
          p_description: description.trim() || null,
          p_starting_price: sp,
          p_current_price: sp,
          p_min_increment: inc,
          p_ends_at: endsAt,
          p_county: county,
          p_city: city,
          p_delivery_mode: deliveryMode,
          p_buy_now_price: buyNow,
        }
      );

      if (createErr) {
        const rawMessage =
          createErr.message || "Nem sikerült létrehozni az aukciót.";

        if (rawMessage.includes("NEGATIVE_BALANCE_BLOCKED")) {
          toast.error(
            "Az egyenleged -175 Ft alatt van, ezért új aukciót most nem tudsz indítani."
          );
          return;
        }

        toast.error(rawMessage);
        return;
      }

      const createdRow = created as CreatedListingRow | CreatedListingRow[] | null;
      const listingId = Array.isArray(createdRow)
        ? createdRow[0]?.id
        : createdRow?.id;

      if (!listingId) {
        toast.error("Hiányzik a létrehozott aukció azonosítója.");
        return;
      }

      const uploadedUrls: string[] = [];
      const uploadedPaths: string[] = [];

      if (files.length > 0) {
        const orderedFiles = [...files];
        const safeFeaturedIndex = Math.min(
          featuredImageIndex,
          orderedFiles.length - 1
        );

        if (safeFeaturedIndex > 0) {
          const [featured] = orderedFiles.splice(safeFeaturedIndex, 1);
          orderedFiles.unshift(featured);
        }

        for (let i = 0; i < orderedFiles.length; i++) {
          const f = orderedFiles[i];
          const safeName = safeFileName(f.name);
          const path = `${uid}/${listingId}_${Date.now()}_${i}_${safeName}`;

          const { error: upErr } = await supabase.storage
            .from("listing-images")
            .upload(path, f, { upsert: false });

          if (upErr) {
            toast.error(`Feltöltési hiba: ${upErr.message}`);
            return;
          }

          uploadedPaths.push(path);
          const { data: pub } = supabase.storage
            .from("listing-images")
            .getPublicUrl(path);
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
          return;
        }
      }

      toast.success("Aukció létrehozva ✅");
      router.push(`/listing/${listingId}`);
      router.refresh();
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
              Tölts fel jó képeket, válaszd ki a főkategóriát, add meg a helyszínt
              és indítsd el az aukciót prémium megjelenéssel.
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
              AI képalapú kitöltés
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
                Tölts fel képet, válaszd ki a főképét, kérj AI segítséget, majd
                ellenőrizd az adatokat.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="space-y-3">
                  <Label>Képek</Label>

                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFilesChange(e.target.files)}
                    className="h-12 rounded-xl"
                  />

                  <p className="text-xs text-muted-foreground">
                    Tipp: 3–6 kép ideális, jó fényben, több szögből. A kiválasztott
                    főkép fog elöl megjelenni a hirdetésben.
                  </p>

                  {featuredPreviewUrl ? (
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                      <div className="border-b bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                        Főkép előnézet
                      </div>
                      <div className="flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06),transparent_40%),#f8fafc] p-4">
                        <img
                          src={featuredPreviewUrl}
                          alt="featured-preview"
                          className="max-h-[360px] w-full rounded-2xl object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                      <ImageIcon className="mr-2 h-5 w-5" />
                      Még nincs kiválasztott kép
                    </div>
                  )}

                  {previewUrls.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-600">
                        Válaszd ki a főképét
                      </div>

                      <div className="flex gap-3 overflow-auto pb-1">
                        {previewUrls.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => setFeaturedImageIndex(index)}
                            className={`relative shrink-0 overflow-hidden rounded-2xl border transition ${
                              featuredImageIndex === index
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <img
                              src={url}
                              alt={`preview-${index}`}
                              className="h-24 w-24 object-cover sm:h-28 sm:w-28"
                            />

                            <div className="absolute left-2 top-2">
                              {featuredImageIndex === index ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white">
                                  <Star className="h-3 w-3 fill-current" />
                                  Főkép
                                </span>
                              ) : (
                                <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
                                  #{index + 1}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={fillFromImageWithAI}
                    disabled={aiImageLoading || files.length === 0}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {aiImageLoading
                      ? "AI elemzés folyamatban..."
                      : "AI kitöltés a kiválasztott képből"}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Az AI a kiválasztott főkép alapján megpróbál címet, leírást és
                    kategóriát javasolni.
                  </p>

                  {aiReason ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                      <span className="font-medium text-slate-900">
                        AI javaslat indoka:
                      </span>{" "}
                      {aiReason}
                    </div>
                  ) : null}
                </div>
              </div>

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
                  placeholder="Írd le az állapotot, tartozékokat, átvételt, méretet, hibákat, mindent, ami segíti a licitálókat."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[160px] rounded-xl"
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
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      if (!value) {
                        setDurationHours("");
                        return;
                      }

                      const num = Number(value);
                      setDurationHours(String(Math.min(num, 72)));
                    }}
                    inputMode="numeric"
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 1 óra, maximum 72 óra.
                  </p>
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

                <div className="space-y-2">
                  <Label>Kategória</Label>
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
                        {selectedCategoryLabel}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Kötelező kiválasztani.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vármegye</Label>
                  <Input
                    placeholder="Kezdd el beírni, pl. Pest"
                    value={countyQuery}
                    onChange={(e) => {
                      setCountyQuery(e.target.value);
                      setCounty("");
                    }}
                    className="h-12 rounded-xl"
                  />

                  {filteredCounties.length > 0 ? (
                    <div className="max-h-48 overflow-auto rounded-2xl border bg-white p-2">
                      <div className="flex flex-wrap gap-2">
                        {filteredCounties.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setCounty(item);
                              setCountyQuery(item);
                            }}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${
                              county === item
                                ? "bg-primary text-primary-foreground"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Település</Label>
                  <Input
                    placeholder={
                      county
                        ? "Kezdd el beírni, pl. Cegléd"
                        : "Előbb válassz vármegyét"
                    }
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      setCity("");
                    }}
                    disabled={!county}
                    className="h-12 rounded-xl"
                  />

                  {county && filteredCities.length > 0 ? (
                    <div className="max-h-48 overflow-auto rounded-2xl border bg-white p-2">
                      <div className="flex flex-wrap gap-2">
                        {filteredCities.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setCity(item);
                              setCityQuery(item);
                            }}
                            className={`rounded-full px-3 py-1.5 text-sm transition ${
                              city === item
                                ? "bg-primary text-primary-foreground"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
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
              <CardDescription>Így fog megjelenni az oldalon.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              {featuredPreviewUrl ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                  <img
                    src={featuredPreviewUrl}
                    alt="cover-preview"
                    className="h-56 w-full object-cover"
                  />
                  <div className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-600">
                    Ez lesz a főkép a hirdetésben
                  </div>
                </div>
              ) : (
                <div className="flex h-56 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  Főkép előnézet
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Cím</div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {title.trim() || "Még nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Kezdőár</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {Number.isFinite(sp) ? formatHuf(sp) : "-"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Licitlépcső
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {Number.isFinite(inc) ? formatHuf(inc) : "-"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Időtartam
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {Number.isFinite(hours) ? `${Math.min(hours, 72)} óra` : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Következő minimum
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {Number.isFinite(sp) && Number.isFinite(inc)
                    ? formatHuf(sp + inc)
                    : "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Villámár</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {buyNow !== null && Number.isFinite(buyNow)
                    ? formatHuf(buyNow)
                    : "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Kategória</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {selectedCategoryLabel || "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Helyszín
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {county && city ? `${county} · ${city}` : "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Truck className="h-3.5 w-3.5" />
                  Átvételi mód
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {deliveryMode
                    ? DELIVERY_MODES.find((x) => x.value === deliveryMode)?.label ??
                      deliveryMode
                    : "Nincs megadva"}
                </div>
              </div>

              <div className="rounded-2xl border p-4 text-xs text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Tippek
                </div>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Legyen jó a főkép — ez adja az első benyomást.</li>
                  <li>Írj pontos állapotot, méretet, hibát is.</li>
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