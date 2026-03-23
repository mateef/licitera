import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const listingId = String(body?.listingId || "");

    if (!listingId) {
      return NextResponse.json({ error: "Hiányzó listingId." }, { status: 400 });
    }

    const { data: listing, error } = await admin
      .from("listings")
      .select("id,title,user_id,winner_user_id,final_price,current_price")
      .eq("id", listingId)
      .single();

    if (error || !listing) {
      return NextResponse.json(
        { error: error?.message || "Aukció nem található." },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://licitera.hu";

    const tasks: Promise<any>[] = [];

    if (listing.user_id) {
      tasks.push(
        fetch(`${siteUrl}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: listing.user_id,
            title: "Lezárult az aukciód",
            message: `A(z) "${listing.title}" aukció lezárult.`,
            data: {
              type: "auction_ended",
              listingId,
            },
          }),
        })
      );
    }

    if (listing.winner_user_id) {
      tasks.push(
        fetch(`${siteUrl}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: listing.winner_user_id,
            title: "Megnyerted az aukciót",
            message: `Gratulálunk, megnyerted: ${listing.title}`,
            data: {
              type: "auction_ended",
              listingId,
            },
          }),
        })
      );
    }

    await Promise.all(tasks);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Auction ended push hiba." },
      { status: 500 }
    );
  }
}