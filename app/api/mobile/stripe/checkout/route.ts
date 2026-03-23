import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const STANDARD_PRICE_ID = process.env.STRIPE_STANDARD_PRICE_ID!;
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tier = String(body?.tier || "");
    const userId = String(body?.userId || "");

    if (!tier || !userId) {
      return NextResponse.json(
        { error: "Hiányzó tier vagy userId." },
        { status: 400 }
      );
    }

    const priceId =
      tier === "pro"
        ? PRO_PRICE_ID
        : tier === "standard"
        ? STANDARD_PRICE_ID
        : null;

    if (!priceId) {
      return NextResponse.json(
        { error: "Érvénytelen előfizetési szint." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/billing?success=1`,
      cancel_url: `${SITE_URL}/billing?cancel=1`,
      client_reference_id: userId,
      metadata: {
        userId,
        tier,
        source: "mobile",
      },
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Nem sikerült létrehozni a checkout sessiont." },
      { status: 500 }
    );
  }
}