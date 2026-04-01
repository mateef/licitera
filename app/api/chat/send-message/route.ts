import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAndSendNotification } from "@/lib/notifications/createAndSendNotification";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toPublicName(fullName: string | null | undefined) {
  if (!fullName) return "Új üzenet";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Új üzenet";
  if (parts.length === 1) return parts[0];

  const firstName = parts[parts.length - 1];
  const lastNameInitial = parts[0].charAt(0).toUpperCase();

  return `${firstName} ${lastNameInitial}.`;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const anon = createClient(
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
    } = await anon.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const threadId = String(body?.threadId || "").trim();
    const senderId = String(body?.senderId || "").trim();
    const message = String(body?.message || "").trim();

    if (!threadId || !senderId || !message) {
      return NextResponse.json(
        { error: "Hiányzó threadId, senderId vagy message." },
        { status: 400 }
      );
    }

    if (senderId !== user.id) {
      return NextResponse.json(
        { error: "A senderId nem egyezik a bejelentkezett felhasználóval." },
        { status: 403 }
      );
    }

    const { data: thread, error: threadError } = await admin
      .from("chat_threads")
      .select("id,buyer_id,seller_id,listing_id")
      .eq("id", threadId)
      .maybeSingle();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: threadError?.message || "Chat szál nem található." },
        { status: 404 }
      );
    }

    const isParticipant =
      user.id === thread.buyer_id || user.id === thread.seller_id;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Ehhez a beszélgetéshez nincs hozzáférésed." },
        { status: 403 }
      );
    }

    const receiverUserId =
      thread.buyer_id === senderId ? thread.seller_id : thread.buyer_id;

    const { data: inserted, error: insertError } = await admin
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        message,
      })
      .select("id,thread_id,sender_id,message,created_at")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message || "Nem sikerült elküldeni az üzenetet." },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();

    await admin
      .from("chat_thread_members")
      .upsert(
        {
          thread_id: threadId,
          user_id: senderId,
          last_read_at: nowIso,
        },
        {
          onConflict: "thread_id,user_id",
        }
      );

    if (receiverUserId) {
      const [{ data: profile }, { data: listing }] = await Promise.all([
        admin
          .from("profiles")
          .select("full_name,public_display_name")
          .eq("id", senderId)
          .maybeSingle(),
        admin
          .from("listings")
          .select("id,title")
          .eq("id", thread.listing_id)
          .maybeSingle(),
      ]);

      const senderName =
        (profile as any)?.public_display_name ||
        toPublicName((profile as any)?.full_name);

      const listingTitle = String((listing as any)?.title || "Hirdetés");
      const listingId = String((listing as any)?.id || thread.listing_id || "");

      await createAndSendNotification({
        userId: receiverUserId,
        type: "chat_message",
        title: `${senderName} üzent`,
        message: `${listingTitle} • ${message}`,
        link: `/(app)/(tabs)/chat/${threadId}`,
        entityType: "chat_thread",
        entityId: threadId,
        uniqueKey: `chat_message:${inserted.id}`,
        data: {
          type: "chat_message",
          threadId,
          listingId,
          listingTitle,
          senderName,
          messagePreview: message,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: inserted,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Chat küldési hiba." },
      { status: 500 }
    );
  }
}