import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createAndSendNotification } from "@/lib/notifications/createAndSendNotification";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

type ListingRow = {
  id: string;
  title: string;
  user_id: string | null;
  current_price: number;
  starting_price: number;
  ends_at: string;
  buy_now_price: number | null;
  is_active: boolean;
  closed_at: string | null;
  winner_user_id: string | null;
  final_price: number | null;
};

type BidRow = {
  id: string;
  user_id: string | null;
  amount: number;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function formatHufAmount(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }

  return "Ismeretlen hiba történt.";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nowIso = new Date().toISOString();

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select(`
        id,
        title,
        user_id,
        current_price,
        starting_price,
        ends_at,
        buy_now_price,
        is_active,
        closed_at,
        winner_user_id,
        final_price
      `)
      .eq("is_active", true)
      .is("closed_at", null)
      .lte("ends_at", nowIso);

    if (listingsError) {
      return NextResponse.json(
        { error: getErrorMessage(listingsError) },
        { status: 500 }
      );
    }

    const rows = (listings ?? []) as ListingRow[];

    let processed = 0;
    let wonCount = 0;
    let noBidCount = 0;

    for (const listing of rows) {
      const { data: bids, error: bidsError } = await supabase
        .from("bids")
        .select("id,user_id,amount,created_at")
        .eq("listing_id", listing.id)
        .order("amount", { ascending: false })
        .order("created_at", { ascending: true });

      if (bidsError) {
        console.error(
          "Bids load error for listing:",
          listing.id,
          getErrorMessage(bidsError)
        );
        continue;
      }

      const bidRows = (bids ?? []) as BidRow[];
      const topBid = bidRows.length > 0 ? bidRows[0] : null;

      if (topBid?.user_id) {
        const finalPrice = topBid.amount;

        const { data: updatedRows, error: updateError } = await supabase
          .from("listings")
          .update({
            is_active: false,
            closed_at: nowIso,
            winner_user_id: topBid.user_id,
            final_price: finalPrice,
            current_price: finalPrice,
          })
          .eq("id", listing.id)
          .eq("is_active", true)
          .is("closed_at", null)
          .select();

        if (updateError) {
          console.error(
            "Listing update error:",
            listing.id,
            getErrorMessage(updateError)
          );
          continue;
        }

        if (!updatedRows || updatedRows.length === 0) {
          continue;
        }

        wonCount += 1;
        processed += 1;

        const userIds = [listing.user_id, topBid.user_id].filter(Boolean) as string[];

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,full_name,email,phone")
          .in("id", userIds);

        if (profilesError) {
          console.error(
            "Profiles load error:",
            listing.id,
            getErrorMessage(profilesError)
          );
          continue;
        }

        const profileRows = (profiles ?? []) as ProfileRow[];

        const seller = profileRows.find((p) => p.id === listing.user_id);
        const winner = profileRows.find((p) => p.id === topBid.user_id);

        const listingUrl = `${getSiteUrl()}/listing/${listing.id}`;
        const formattedPrice = formatHufAmount(finalPrice);

        if (listing.user_id) {
          await createAndSendNotification({
            userId: listing.user_id,
            type: "auction_sold",
            title: "Lejárt az aukciód, és lett nyertes",
            message: `Nyertes licit érkezett erre: ${listing.title}`,
            link: `/listing/${listing.id}`,
            entityType: "listing",
            entityId: listing.id,
            uniqueKey: `auction_sold:${listing.id}:${listing.user_id}`,
            data: {
              listingId: listing.id,
              type: "auction_sold",
            },
          });
        }

        await createAndSendNotification({
          userId: topBid.user_id,
          type: "auction_won",
          title: "Megnyertél egy aukciót",
          message: `Sikeresen megnyerted ezt az aukciót: ${listing.title}`,
          link: `/listing/${listing.id}`,
          entityType: "listing",
          entityId: listing.id,
          uniqueKey: `auction_won:${listing.id}:${topBid.user_id}`,
          data: {
            listingId: listing.id,
            type: "auction_won",
          },
        });

        const losingBidderIds = Array.from(
          new Set(
            bidRows
              .map((bid) => bid.user_id)
              .filter(
                (userId): userId is string =>
                  !!userId && userId !== topBid.user_id
              )
          )
        );

        for (const losingUserId of losingBidderIds) {
          await createAndSendNotification({
            userId: losingUserId,
            type: "auction_lost",
            title: "Nem te nyerted az aukciót",
            message: `Lezárult az aukció, de nem te nyertél: ${listing.title}`,
            link: `/listing/${listing.id}`,
            entityType: "listing",
            entityId: listing.id,
            uniqueKey: `auction_lost:${listing.id}:${losingUserId}`,
            data: {
              listingId: listing.id,
              type: "auction_lost",
            },
          });
        }

        const from = process.env.LICITERA_FROM_EMAIL;

        if (from && seller?.email && winner?.email) {
          const sellerName = seller.full_name || "Eladó";
          const winnerName = winner.full_name || "Vevő";

          await resend.emails.send({
            from,
            to: seller.email,
            subject: `Lejárt az aukciód, és lett nyertes – ${listing.title}`,
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2>Aukció sikeresen lezárult</h2>
                <p>Szia ${sellerName}!</p>
                <p>A következő aukciód lezárult, és lett nyertese:</p>
                <p><strong>${listing.title}</strong></p>
                <p><strong>Nyertes licit:</strong> ${formattedPrice}</p>
                <p>
                  A Licitera a sikeres tranzakció után megosztja a kapcsolattartási adatokat
                  a két fél között, hogy gyorsan egyeztetni tudjátok az átvételt.
                </p>
                <p><strong>Nyertes neve:</strong> ${winner.full_name || "Nincs megadva"}</p>
                <p><strong>Nyertes email címe:</strong> ${winner.email}</p>
                <p><strong>Nyertes telefonszáma:</strong> ${winner.phone ?? "Nincs megadva"}</p>
                <p>
                  Aukció megnyitása:
                  <a href="${listingUrl}">${listingUrl}</a>
                </p>
                <p>Üdv,<br/>Licitera</p>
              </div>
            `,
          });

          await resend.emails.send({
            from,
            to: winner.email,
            subject: `Megnyertél egy aukciót – ${listing.title}`,
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2>Sikeres aukciónyerés</h2>
                <p>Szia ${winnerName}!</p>
                <p>Sikeresen megnyerted az alábbi aukciót:</p>
                <p><strong>${listing.title}</strong></p>
                <p><strong>Nyertes licit:</strong> ${formattedPrice}</p>
                <p>
                  A Licitera a sikeres tranzakció után megosztja a kapcsolattartási adatokat
                  a két fél között, hogy gyorsan egyeztetni tudjátok az átvételt.
                </p>
                <p><strong>Eladó neve:</strong> ${seller.full_name || "Nincs megadva"}</p>
                <p><strong>Eladó email címe:</strong> ${seller.email}</p>
                <p><strong>Eladó telefonszáma:</strong> ${seller.phone ?? "Nincs megadva"}</p>
                <p>
                  Aukció megnyitása:
                  <a href="${listingUrl}">${listingUrl}</a>
                </p>
                <p>Üdv,<br/>Licitera</p>
              </div>
            `,
          });
        }
      } else {
        const { data: updatedRows, error: updateError } = await supabase
          .from("listings")
          .update({
            is_active: false,
            closed_at: nowIso,
            winner_user_id: null,
            final_price: null,
          })
          .eq("id", listing.id)
          .eq("is_active", true)
          .is("closed_at", null)
          .select();

        if (updateError) {
          console.error(
            "No-bid listing update error:",
            listing.id,
            getErrorMessage(updateError)
          );
          continue;
        }

        if (!updatedRows || updatedRows.length === 0) {
          continue;
        }

        noBidCount += 1;
        processed += 1;

        if (listing.user_id) {
          await createAndSendNotification({
            userId: listing.user_id,
            type: "listing_expired_no_bids",
            title: "Lejárt egy aukciód licit nélkül",
            message: `Erre a hirdetésre nem érkezett licit: ${listing.title}`,
            link: `/listing/${listing.id}`,
            entityType: "listing",
            entityId: listing.id,
            uniqueKey: `listing_expired_no_bids:${listing.id}:${listing.user_id}`,
            data: {
              listingId: listing.id,
              type: "listing_expired_no_bids",
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      wonCount,
      noBidCount,
    });
  } catch (error: unknown) {
    console.error("finalize-ended-auctions route error:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}