import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://licitera.hu";

    await fetch(`${siteUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: receiverUserId,
        title: "Új üzenet érkezett",
        message: `${senderName} új üzenetet küldött.`,
        data: {
          type: "chat_message",
          threadId,
          listingId: listingId || undefined,
        },
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Chat push hiba." },
      { status: 500 }
    );
  }
}