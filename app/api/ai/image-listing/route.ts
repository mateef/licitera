import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.responses.create({
      model: "gpt-5.4",
      instructions:
        "Te egy magyar piactér hirdetéssegítő asszisztens vagy. " +
        "A feltöltött termékkép alapján írj rövid, valószínű címet és rövid marketplace leírást magyarul. " +
        "Ne találj ki biztosra olyan dolgot, amit nem lehet látni. " +
        "Csak JSON-t adj vissza ebben a formátumban: " +
        '{"title":"...","description":"...","product_type":"..."}',
      input: [
        {
          role: "user",
          content: [
  {
    type: "input_text",
    text:
      "Elemezd a képet, és adj egy marketplace-kompatibilis címet és rövid leírást magyarul.",
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
      product_type?: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("AI image listing parse error:", text);
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
        productType: parsed.product_type?.trim() ?? "",
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