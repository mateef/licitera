import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendExpoPush } from "@/lib/expo-push";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "");
    const title = String(body?.title || "");
    const message = String(body?.message || "");
    const data = body?.data ?? {};

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "Hiányzó userId, title vagy message." },
        { status: 400 }
      );
    }

    const { data: tokens, error } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pushTokens = (tokens ?? [])
      .map((x: any) => x.expo_push_token)
      .filter(Boolean);

    if (pushTokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    await sendExpoPush({
      to: pushTokens,
      title,
      body: message,
      data,
    });

    return NextResponse.json({
      ok: true,
      sent: pushTokens.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Push küldési hiba." },
      { status: 500 }
    );
  }
}