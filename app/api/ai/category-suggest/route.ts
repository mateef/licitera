import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
};

function buildCategoryPaths(categories: CategoryRow[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenByParent = new Map<string | null, CategoryRow[]>();

  for (const cat of categories) {
    const prev = childrenByParent.get(cat.parent_id) ?? [];
    prev.push(cat);
    childrenByParent.set(cat.parent_id, prev);
  }

  const result: Array<{
    l1Id: string;
    l1Name: string;
    l2Id: string;
    l2Name: string;
    l3Id: string;
    l3Name: string;
  }> = [];

  const level1 = childrenByParent.get(null) ?? [];

  for (const l1 of level1) {
    const level2 = childrenByParent.get(l1.id) ?? [];
    for (const l2 of level2) {
      const level3 = childrenByParent.get(l2.id) ?? [];
      for (const l3 of level3) {
        result.push({
          l1Id: l1.id,
          l1Name: l1.name,
          l2Id: l2.id,
          l2Name: l2.name,
          l3Id: l3.id,
          l3Name: l3.name,
        });
      }
    }
  }

  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();

    if (!title && !description) {
      return NextResponse.json(
        { error: "Adj meg legalább címet vagy leírást." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !openaiKey) {
      return NextResponse.json(
        { error: "Hiányzik valamelyik szerveroldali környezeti változó." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id,name,parent_id")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (categoryError || !categories) {
      return NextResponse.json(
        { error: "Nem sikerült betölteni a kategóriákat." },
        { status: 500 }
      );
    }

    const paths = buildCategoryPaths(categories as CategoryRow[]);

    if (paths.length === 0) {
      return NextResponse.json(
        { error: "Nincsenek elérhető kategóriák." },
        { status: 500 }
      );
    }

    const categoryListText = paths
      .map(
        (p, index) =>
          `${index + 1}. ${p.l1Name} > ${p.l2Name} > ${p.l3Name} | IDs: ${p.l1Id}, ${p.l2Id}, ${p.l3Id}`
      )
      .join("\n");

    const response = await openai.responses.create({
      model: "gpt-5",
      instructions:
        "Te egy magyar piactér kategorizáló asszisztens vagy. " +
        "A feladatod, hogy a megadott hirdetéscím és leírás alapján a legjobb egyetlen kategóriaútvonalat válaszd ki. " +
        "Csak a kapott kategórialistából választhatsz. " +
        "Csak JSON-t adj vissza, magyarázat nélkül. " +
        'A JSON formátuma pontosan ez legyen: {"l1Id":"...","l2Id":"...","l3Id":"...","reason":"..."}',
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Hirdetés címe: ${title || "-"}\n` +
                `Hirdetés leírása: ${description || "-"}\n\n` +
                `Választható kategóriák:\n${categoryListText}`,
            },
          ],
        },
      ],
    });

    const text = response.output_text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Az AI nem adott értékelhető választ." },
        { status: 500 }
      );
    }

    let parsed: {
      l1Id: string;
      l2Id: string;
      l3Id: string;
      reason?: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Az AI válasza nem volt feldolgozható." },
        { status: 500 }
      );
    }

    const match = paths.find(
      (p) =>
        p.l1Id === parsed.l1Id &&
        p.l2Id === parsed.l2Id &&
        p.l3Id === parsed.l3Id
    );

    if (!match) {
      return NextResponse.json(
        { error: "Az AI nem létező kategóriát választott." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestion: {
        l1Id: match.l1Id,
        l1Name: match.l1Name,
        l2Id: match.l2Id,
        l2Name: match.l2Name,
        l3Id: match.l3Id,
        l3Name: match.l3Name,
        reason: parsed.reason ?? "",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Váratlan szerverhiba történt." },
      { status: 500 }
    );
  }
}