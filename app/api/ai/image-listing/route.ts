import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const imageUrl = String(body?.imageUrl ?? "").trim();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Hiányzik a kép URL." },
        { status: 400 }
      );
    }

    // kategóriák lekérése
    const { data: categories } = await supabase
      .from("categories")
      .select("id,name,parent_id");

    if (!categories) {
      return NextResponse.json(
        { error: "Nem sikerült kategóriákat betölteni." },
        { status: 500 }
      );
    }

    const categoryList = categories
      .map((c) => `${c.id} | ${c.name} | parent:${c.parent_id ?? "null"}`)
      .join("\n");

    const response = await openai.responses.create({
      model: "gpt-5.4",
      instructions:
        "Te egy magyar piactér hirdetéssegítő asszisztens vagy. " +
        "A feltöltött kép alapján írj rövid címet és leírást magyarul. " +
        "Ezután válassz a megadott kategórialistából egy megfelelő kategóriát. " +
        "Csak a listában szereplő kategóriákat használhatod. " +
        "JSON formátumban válaszolj így: " +
        '{"title":"...","description":"...","l1Id":"...","l2Id":"...","l3Id":"...","reason":"..."}',

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Elemezd a képet és javasolj címet, leírást és kategóriát.\n\n" +
                "Kategóriák:\n" +
                categoryList,
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "auto",
            },
          ],
        },
      ],
    });

    const text = response.output_text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Az AI nem adott választ." },
        { status: 500 }
      );
    }

    let parsed: {
      title?: string;
      description?: string;
      l1Id?: string;
      l2Id?: string;
      l3Id?: string;
      reason?: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("AI parse error:", text);
      return NextResponse.json(
        { error: "Az AI válasza nem volt feldolgozható." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        title: parsed.title?.trim() ?? "",
        description: parsed.description?.trim() ?? "",
        l1Id: parsed.l1Id ?? "",
        l2Id: parsed.l2Id ?? "",
        l3Id: parsed.l3Id ?? "",
        reason: parsed.reason ?? "",
      },
    });
  } catch (error: any) {
    console.error("AI image listing route error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.toString() ||
          "Váratlan szerverhiba történt.",
      },
      { status: 500 }
    );
  }
}