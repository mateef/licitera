"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatHuf } from "@/lib/format";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function CreateListingPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("1000");
  const [durationHours, setDurationHours] = useState("24");
  const [minIncrement, setMinIncrement] = useState("100");
  const [files, setFiles] = useState<FileList | null>(null);

  // 3 szint kategória
  const [catsL1, setCatsL1] = useState<Category[]>([]);
  const [catsL2, setCatsL2] = useState<Category[]>([]);
  const [catsL3, setCatsL3] = useState<Category[]>([]);

  const [catL1, setCatL1] = useState("");
  const [catL2, setCatL2] = useState("");
  const [catL3, setCatL3] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const finalCategoryId = useMemo(() => catL3 || catL2 || catL1 || "", [catL1, catL2, catL3]);

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
    setCatsL1((data ?? []) as any);
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

  const sp = useMemo(() => Number(startingPrice), [startingPrice]);
  const inc = useMemo(() => Number(minIncrement), [minIncrement]);
  const hours = useMemo(() => Number(durationHours), [durationHours]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!Number.isFinite(sp) || sp <= 0) return false;
    if (!Number.isFinite(inc) || inc <= 0) return false;
    if (!Number.isFinite(hours) || hours <= 0) return false;
    return true;
  }, [title, sp, inc, hours]);

  async function createListing() {
    if (submitting) return;

    if (!title.trim()) return toast.error("Adj címet.");
    if (!Number.isFinite(sp) || sp <= 0) return toast.error("A kezdőár legyen 0-nál nagyobb.");
    if (!Number.isFinite(inc) || inc <= 0) return toast.error("A licitlépcső legyen 0-nál nagyobb.");
    if (!Number.isFinite(hours) || hours <= 0) return toast.error("Az időtartam legyen 0-nál nagyobb.");

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
        })
        .select("id")
        .single();

      if (createErr) {
        toast.error(createErr.message);
        setSubmitting(false);
        return;
      }

      const listingId = created.id as string;

      // upload images
      const uploadedUrls: string[] = [];
      const uploadedPaths: string[] = [];

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const safeName = safeFileName(f.name);
          const path = `${uid}/${listingId}_${Date.now()}_${safeName}`;

          const { error: upErr } = await supabase.storage.from("listing-images").upload(path, f, { upsert: false });
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
      setFiles(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* FORM */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Aukció létrehozása</CardTitle>
            <CardDescription>Add meg az alapadatokat, tölts fel képeket, és indíthatod is.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Cím</Label>
              <Input
                id="title"
                placeholder="Pl.: iPhone 13, 128GB, hibátlan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Legyen rövid és beszédes. A jó cím több licitet hoz.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Leírás</Label>
              <Textarea
                id="desc"
                placeholder="Írd le az állapotot, tartozékokat, átvételt, stb."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kezdőár</Label>
                <Input value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} inputMode="decimal" />
              </div>

              <div className="space-y-2">
                <Label>Licitlépcső</Label>
                <Input value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)} inputMode="decimal" />
              </div>

              <div className="space-y-2">
                <Label>Időtartam (óra)</Label>
                <Input value={durationHours} onChange={(e) => setDurationHours(e.target.value)} inputMode="numeric" />
              </div>

              <div className="space-y-2">
                <Label>Képek</Label>
                <Input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} />
                <p className="text-xs text-muted-foreground">
                  Tipp: 3–6 kép ideális (jó fény, több szög).
                </p>
              </div>
            </div>

            {/* 3 szintű kategória */}
            <div className="space-y-2">
              <Label>Kategória</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm bg-background"
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
                  className="h-10 w-full rounded-md border px-3 text-sm bg-background"
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
                  className="h-10 w-full rounded-md border px-3 text-sm bg-background"
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
            </div>

            <Button className="w-full" onClick={createListing} disabled={!canSubmit || submitting}>
              {submitting ? "Létrehozás folyamatban…" : "Aukció indítása"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SUMMARY */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-base">Összefoglaló</CardTitle>
            <CardDescription>Így fog megjelenni nagyjából a licitdoboz logikája.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kezdőár</span>
              <span className="font-semibold">{Number.isFinite(sp) ? formatHuf(sp) : "-"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Licitlépcső</span>
              <span className="font-medium">{Number.isFinite(inc) ? formatHuf(inc) : "-"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Következő minimum</span>
              <span className="font-semibold">
                {Number.isFinite(sp) && Number.isFinite(inc) ? formatHuf(sp + inc) : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Időtartam</span>
              <span className="font-medium">{Number.isFinite(hours) ? `${hours} óra` : "-"}</span>
            </div>

            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              <div className="mb-2 font-medium text-foreground">Tippek</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Legyen jó a fő kép — ez adja az első benyomást.</li>
                <li>Írj pontos átvételt/szállítást a leírásba.</li>
                <li>Ne legyen túl kicsi a licitlépcső (spam licitek).</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Gyors</Badge>
              <Badge variant="secondary">Átlátható</Badge>
              <Badge variant="secondary">Csak licit</Badge>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href="/listings">Vissza a listára</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}