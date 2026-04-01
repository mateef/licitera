import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendExpoPush } from "@/lib/expo-push";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userId = String(body?.userId || "").trim();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const data = body?.data ?? {};

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "Hiányzó userId, title vagy message." },
        { status: 400 }
      );
    }

    const { data: tokenRows, error: tokenError } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const pushTokens = (tokenRows ?? [])
      .map((row: any) => String(row?.expo_push_token || "").trim())
      .filter(Boolean);

    if (pushTokens.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        reason: "Nincs aktív push token.",
      });
    }

    const result = await sendExpoPush({
      to: pushTokens,
      title,
      body: message,
      data,
    });

    if (result.invalidTokens.length > 0) {
      await admin
        .from("push_tokens")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .in("expo_push_token", result.invalidTokens);
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      invalidated: result.invalidTokens.length,
      tickets: result.tickets,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Push küldési hiba." },
      { status: 500 }
    );
  }
}