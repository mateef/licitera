import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageUrls } = await req.json();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Írd le a képen lévő terméket, adj címet és leírást." },
              ...imageUrls.map((url: string) => ({
                type: "input_image",
                image_url: url,
              })),
            ],
          },
        ],
      }),
    });

    const json = await response.json();

    const text = json.output?.[0]?.content?.[0]?.text || "";

    return NextResponse.json({
      suggestedTitle: text.slice(0, 60),
      suggestedDescription: text,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}