import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendExpoPush } from "@/lib/expo-push";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PushTokenRow = {
  expo_push_token: string | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userId = String(body?.userId || "").trim();
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const data = body?.data ?? {};

    const sendToAll =
      body?.sendToAll === true ||
      body?.allUsers === true ||
      String(body?.target || "").trim().toLowerCase() === "all";

    if (!title || !message) {
      return NextResponse.json(
        { error: "Hiányzó title vagy message." },
        { status: 400 }
      );
    }

    if (!sendToAll && !userId) {
      return NextResponse.json(
        { error: "Hiányzó userId. Ha mindenkinek küldenéd, add át a sendToAll: true mezőt." },
        { status: 400 }
      );
    }

    let query = admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("is_active", true);

    if (!sendToAll) {
      query = query.eq("user_id", userId);
    }

    const { data: tokenRows, error: tokenError } = await query;

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    const pushTokens = Array.from(
      new Set(
        ((tokenRows ?? []) as PushTokenRow[])
          .map((row) => String(row?.expo_push_token || "").trim())
          .filter(Boolean)
      )
    );

    if (pushTokens.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        target: sendToAll ? "all" : userId,
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
      target: sendToAll ? "all" : userId,
      requested_tokens: pushTokens.length,
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