import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const body = await req.json();
    const threadId = String(body?.threadId || "");
    const senderId = String(body?.senderId || "");
    const message = String(body?.message || "").trim();

    if (!threadId || !senderId || !message) {
      return NextResponse.json(
        { error: "Hiányzó threadId, senderId vagy message." },
        { status: 400 }
      );
    }

    const { data: thread, error: threadError } = await admin
      .from("chat_threads")
      .select("id,buyer_user_id,seller_user_id,listing_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: threadError?.message || "Chat szál nem található." },
        { status: 404 }
      );
    }

    const receiverUserId =
      thread.buyer_user_id === senderId ? thread.seller_user_id : thread.buyer_user_id;

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

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,public_display_name")
      .eq("id", senderId)
      .maybeSingle();

    const senderName =
      (profile as any)?.public_display_name ||
      toPublicName((profile as any)?.full_name);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://licitera.hu";

    if (receiverUserId) {
      await fetch(`${siteUrl}/api/notifications/chat-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverUserId,
          senderName,
          threadId,
          listingId: thread.listing_id,
        }),
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