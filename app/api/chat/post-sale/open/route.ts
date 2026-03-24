import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toPublicName(fullName: string | null | undefined) {
  if (!fullName) return "Ismeretlen felhasználó";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ismeretlen felhasználó";
  if (parts.length === 1) return parts[0];

  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId ?? "").trim();

    if (!listingId) {
      return Response.json({ error: "Hiányzik a listingId." }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,title,user_id,winner_user_id,final_price,buy_now_price,closed_at,is_active")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return Response.json(
        { error: listingError?.message || "A hirdetés nem található." },
        { status: 404 }
      );
    }

    if (!listing.user_id || !listing.winner_user_id) {
      return Response.json(
        { error: "A tranzakció még nem teljes, hiányzik az eladó vagy a vevő." },
        { status: 400 }
      );
    }

    const isParticipant =
      user.id === listing.user_id || user.id === listing.winner_user_id;

    if (!isParticipant) {
      return Response.json(
        { error: "Ehhez a tranzakcióhoz nincs hozzáférésed." },
        { status: 403 }
      );
    }

    const sellerId = listing.user_id;
    const buyerId = listing.winner_user_id;

    const { data: existingThread, error: existingError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("seller_id", sellerId)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (existingError) {
      return Response.json({ error: existingError.message }, { status: 500 });
    }

    let threadId = existingThread?.id as string | undefined;

    if (!threadId) {
      const { data: createdThread, error: createThreadError } = await supabase
        .from("chat_threads")
        .insert({
          listing_id: listing.id,
          seller_id: sellerId,
          buyer_id: buyerId,
        })
        .select("id")
        .single();

      if (createThreadError || !createdThread) {
        return Response.json(
          { error: createThreadError?.message || "Nem sikerült létrehozni a chat threadet." },
          { status: 500 }
        );
      }

      threadId = createdThread.id;

            const nowIso = new Date().toISOString();

      const { error: membersError } = await supabase
        .from("chat_thread_members")
        .insert([
          {
            thread_id: threadId,
            user_id: sellerId,
            last_read_at: nowIso,
          },
          {
            thread_id: threadId,
            user_id: buyerId,
            last_read_at: nowIso,
          },
        ]);

      if (membersError) {
        return Response.json(
          { error: membersError.message || "Nem sikerült létrehozni a chat member sorokat." },
          { status: 500 }
        );
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,public_display_name")
        .in("id", [sellerId, buyerId]);

      const seller = (profiles ?? []).find((x: any) => x.id === sellerId);
      const buyer = (profiles ?? []).find((x: any) => x.id === buyerId);

      const sellerName =
        seller?.public_display_name || toPublicName(seller?.full_name);
      const buyerName =
        buyer?.public_display_name || toPublicName(buyer?.full_name);

      const finalPrice = Number(
        listing.final_price ?? listing.buy_now_price ?? 0
      );

      const formattedPrice =
        new Intl.NumberFormat("hu-HU").format(finalPrice) + " Ft";

      await supabase.from("chat_messages").insert([
        {
          thread_id: threadId,
          sender_id: sellerId,
          message:
            `✅ Sikeres tranzakció: ${listing.title}\nVégső ár: ${formattedPrice}`,
        },
        {
          thread_id: threadId,
          sender_id: sellerId,
          message:
            `🔐 Kapcsolattartási adatok\n\n` +
            `Eladó: ${sellerName}\n` +
            `Email: ${seller?.email ?? "Nincs megadva"}\n` +
            `Telefon: ${seller?.phone ?? "Nincs megadva"}\n\n` +
            `Vevő: ${buyerName}\n` +
            `Email: ${buyer?.email ?? "Nincs megadva"}\n` +
            `Telefon: ${buyer?.phone ?? "Nincs megadva"}`,
        },
      ]);
    }

    return Response.json({ threadId });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Váratlan post-sale chat hiba." },
      { status: 500 }
    );
  }
}