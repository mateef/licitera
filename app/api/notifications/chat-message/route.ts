import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await anonSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const receiverUserId = String(body?.receiverUserId || "");
    const senderName = String(body?.senderName || "Új üzenet");
    const threadId = String(body?.threadId || "");
    const listingId = String(body?.listingId || "");

    if (!receiverUserId || !threadId) {
      return NextResponse.json(
        { error: "Hiányzó receiverUserId vagy threadId." },
        { status: 400 }
      );
    }

    const { data: thread, error: threadError } = await serviceSupabase
      .from("chat_threads")
      .select("id,seller_id,buyer_id,listing_id")
      .eq("id", threadId)
      .maybeSingle();

    if (threadError) {
      return NextResponse.json(
        { error: threadError.message },
        { status: 500 }
      );
    }

    if (!thread) {
      return NextResponse.json(
        { error: "A beszélgetés nem található." },
        { status: 404 }
      );
    }

    const isParticipant =
      user.id === thread.seller_id || user.id === thread.buyer_id;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Ehhez a beszélgetéshez nincs hozzáférésed." },
        { status: 403 }
      );
    }

    const realReceiverUserId =
      user.id === thread.seller_id ? thread.buyer_id : thread.seller_id;

    if (receiverUserId !== realReceiverUserId) {
      return NextResponse.json(
        { error: "Hibás címzett." },
        { status: 403 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://licitera.hu";

    const pushRes = await fetch(`${siteUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: realReceiverUserId,
        title: "Új üzenet érkezett",
        message: `${senderName} új üzenetet küldött.`,
        data: {
          type: "chat_message",
          threadId,
          listingId: listingId || thread.listing_id || undefined,
        },
      }),
    });

    if (!pushRes.ok) {
      const pushData = await pushRes.json().catch(() => null);

      return NextResponse.json(
        { error: pushData?.error || "Push küldési hiba." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Chat push hiba." },
      { status: 500 }
    );
  }
}