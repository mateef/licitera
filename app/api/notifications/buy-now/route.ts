import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createNotification } from "@/lib/notifications/createNotification";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId ?? "").trim();

    if (!listingId) {
      return NextResponse.json(
        { error: "Hiányzik a listingId." },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select(`
        id,
        title,
        final_price,
        buy_now_price,
        winner_user_id,
        user_id
      `)
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: listingError?.message || "A hirdetés nem található." },
        { status: 404 }
      );
    }

    if (!listing.user_id || !listing.winner_user_id) {
      return NextResponse.json(
        { error: "Hiányzik az eladó vagy a vevő azonosítója." },
        { status: 400 }
      );
    }

    const userIds = [listing.user_id, listing.winner_user_id];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError || !profiles) {
      return NextResponse.json(
        { error: profilesError?.message || "A profilok nem tölthetők be." },
        { status: 500 }
      );
    }

    const seller = profiles.find((p) => p.id === listing.user_id);
    const buyer = profiles.find((p) => p.id === listing.winner_user_id);

    if (!seller?.email || !buyer?.email) {
      return NextResponse.json(
        { error: "Az eladó vagy a vevő email címe hiányzik a profiles táblából." },
        { status: 400 }
      );
    }

    const price = Number(listing.final_price ?? listing.buy_now_price ?? 0);
    const formattedPrice = new Intl.NumberFormat("hu-HU").format(price) + " Ft";

    const sellerName = seller.full_name || "Eladó";
    const buyerName = buyer.full_name || "Vevő";

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const listingUrl = `${siteUrl}/listing/${listing.id}`;
    const from = process.env.LICITERA_FROM_EMAIL;

    if (!from) {
      return NextResponse.json(
        { error: "Hiányzik a LICITERA_FROM_EMAIL környezeti változó." },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from,
      to: seller.email,
      subject: `A termékedet megvették villámáron – ${listing.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Sikeres villámáras vásárlás</h2>
          <p>Szia ${sellerName}!</p>
          <p>A következő hirdetésedet megvették villámáron:</p>
          <p><strong>${listing.title}</strong></p>
          <p><strong>Végső ár:</strong> ${formattedPrice}</p>
          <p>A vevő hamarosan fel tudja venni veled a kapcsolatot a további egyeztetéshez.</p>
          <p>
            Hirdetés megnyitása:
            <a href="${listingUrl}">${listingUrl}</a>
          </p>
          <p>Üdv,<br/>Licitera</p>
        </div>
      `,
    });

    await resend.emails.send({
      from,
      to: buyer.email,
      subject: `Sikeres villámáras vásárlás – ${listing.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Sikeres vásárlás</h2>
          <p>Szia ${buyerName}!</p>
          <p>Sikeresen megvásároltad villámáron az alábbi terméket:</p>
          <p><strong>${listing.title}</strong></p>
          <p><strong>Végső ár:</strong> ${formattedPrice}</p>
          <p>Az eladó hamarosan fel tudja venni veled a kapcsolatot, vagy te is megnyithatod a hirdetést:</p>
          <p>
            <a href="${listingUrl}">${listingUrl}</a>
          </p>
          <p>Üdv,<br/>Licitera</p>
        </div>
      `,
    });

    await createNotification({
      userId: listing.user_id,
      type: "auction_sold",
      title: "A termékedet megvették villámáron",
      message: `A következő hirdetésed villámáron elkelt: ${listing.title}`,
      link: `/listing/${listing.id}`,
    });

    await createNotification({
      userId: listing.winner_user_id,
      type: "auction_won",
      title: "Sikeres villámáras vásárlás",
      message: `Sikeresen megvásároltad ezt a terméket: ${listing.title}`,
      link: `/listing/${listing.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("buy-now notification route error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Váratlan szerverhiba történt.",
      },
      { status: 500 }
    );
  }
}