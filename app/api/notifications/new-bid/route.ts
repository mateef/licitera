import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications/createNotification";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId ?? "").trim();
    const bidderUserId = String(body?.bidderUserId ?? "").trim();
    const amount = Number(body?.amount ?? 0);

    if (!listingId || !bidderUserId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Hiányzó vagy hibás adatok." },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,title,user_id")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: listingError?.message || "A hirdetés nem található." },
        { status: 404 }
      );
    }

    // Eladó értesítése
    if (listing.user_id && listing.user_id !== bidderUserId) {
      await createNotification({
        userId: listing.user_id,
        type: "new_bid",
        title: "Új licit érkezett",
        message: `Új licit érkezett a hirdetésedre: ${listing.title}`,
        link: `/listing/${listing.id}`,
      });
    }

    // Előző legmagasabb licitáló keresése
    const { data: previousBids, error: previousBidsError } = await supabase
      .from("bids")
      .select("user_id, amount, created_at")
      .eq("listing_id", listingId)
      .lt("amount", amount)
      .order("amount", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (!previousBidsError && previousBids && previousBids.length > 0) {
      const previousTopBidderId = previousBids[0].user_id;

      if (
        previousTopBidderId &&
        previousTopBidderId !== bidderUserId &&
        previousTopBidderId !== listing.user_id
      ) {
        await createNotification({
          userId: previousTopBidderId,
          type: "outbid",
          title: "Túllicitáltak",
          message: `Valaki magasabb ajánlatot tett ennél: ${listing.title}`,
          link: `/listing/${listing.id}`,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("new-bid notification route error:", error);

    return NextResponse.json(
      { error: error?.message || "Váratlan szerverhiba történt." },
      { status: 500 }
    );
  }
}