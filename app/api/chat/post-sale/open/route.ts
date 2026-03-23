import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  public_display_name: string | null;
};

async function getUserFromBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

function displayName(profile: ProfileRow | null | undefined) {
  if (!profile) return "Ismeretlen felhasználó";
  return profile.public_display_name || profile.full_name || "Ismeretlen felhasználó";
}

function buildContactMessage(label: string, profile: ProfileRow | null | undefined) {
  return [
    `🔐 Kapcsolattartási adatok — ${label}`,
    `Név: ${displayName(profile)}`,
    `Email: ${profile?.email || "Nincs megadva"}`,
    `Telefonszám: ${profile?.phone || "Nincs megadva"}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearerToken(req);

    if (!user) {
      return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId ?? "").trim();

    if (!listingId) {
      return NextResponse.json({ error: "Hiányzik a listingId." }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("id,title,user_id,winner_user_id,closed_at,is_active")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: listingError?.message || "A hirdetés nem található." },
        { status: 404 }
      );
    }

    if (!listing.closed_at || listing.is_active) {
      return NextResponse.json(
        { error: "Chat csak lezárt aukció után nyitható." },
        { status: 400 }
      );
    }

    if (!listing.user_id || !listing.winner_user_id) {
      return NextResponse.json(
        { error: "Ehhez az aukcióhoz nincs elérhető eladó/nyertes pár." },
        { status: 400 }
      );
    }

    const isSeller = user.id === listing.user_id;
    const isWinner = user.id === listing.winner_user_id;

    if (!isSeller && !isWinner) {
      return NextResponse.json(
        { error: "Ehhez a beszélgetéshez nincs hozzáférésed." },
        { status: 403 }
      );
    }

    let { data: existingThread, error: threadFindError } = await supabaseAdmin
      .from("chat_threads")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("seller_id", listing.user_id)
      .eq("buyer_id", listing.winner_user_id)
      .maybeSingle();

    if (threadFindError) {
      return NextResponse.json({ error: threadFindError.message }, { status: 500 });
    }

    if (!existingThread) {
      const { data: insertedThread, error: insertThreadError } = await supabaseAdmin
        .from("chat_threads")
        .insert({
          listing_id: listing.id,
          seller_id: listing.user_id,
          buyer_id: listing.winner_user_id,
        })
        .select("id")
        .single();

      if (insertThreadError || !insertedThread) {
        return NextResponse.json(
          { error: insertThreadError?.message || "Nem sikerült létrehozni a chatet." },
          { status: 500 }
        );
      }

      existingThread = insertedThread;
    }

    const threadId = existingThread.id as string;

    const { data: existingMessages, error: existingMessagesError } = await supabaseAdmin
      .from("chat_messages")
      .select("id")
      .eq("thread_id", threadId)
      .limit(1);

    if (existingMessagesError) {
      return NextResponse.json({ error: existingMessagesError.message }, { status: 500 });
    }

    if (!existingMessages || existingMessages.length === 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name,email,phone,public_display_name")
        .in("id", [listing.user_id, listing.winner_user_id]);

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      const seller = (profiles ?? []).find((p: any) => p.id === listing.user_id) as ProfileRow | undefined;
      const buyer = (profiles ?? []).find((p: any) => p.id === listing.winner_user_id) as ProfileRow | undefined;

      const introMessages = [
        {
          thread_id: threadId,
          sender_id: listing.user_id,
          message: `✅ Sikeres tranzakció: ${listing.title}`,
        },
        {
          thread_id: threadId,
          sender_id: listing.user_id,
          message: buildContactMessage("Eladó", seller),
        },
        {
          thread_id: threadId,
          sender_id: listing.winner_user_id,
          message: buildContactMessage("Vevő", buyer),
        },
      ];

      const { error: introInsertError } = await supabaseAdmin
        .from("chat_messages")
        .insert(introMessages);

      if (introInsertError) {
        return NextResponse.json({ error: introInsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      threadId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Nem sikerült megnyitni a post-sale chatet." },
      { status: 500 }
    );
  }
}