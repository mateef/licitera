import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tier = body?.tier as "standard" | "pro" | undefined;

    if (!tier || !["standard", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Érvénytelen csomag." }, { status: 400 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Hiányzó auth token." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Nem sikerült azonosítani a felhasználót." }, { status: 401 });
    }

    const priceId =
      tier === "standard"
        ? process.env.STRIPE_STANDARD_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Hiányzó Stripe price ID." }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let stripeCustomerId = (profile as any)?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? (profile as any)?.email ?? undefined,
        name: (profile as any)?.full_name ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({
          stripe_customer_id: stripeCustomerId,
        })
        .eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${appUrl}/profile?stripe=subscription_success`,
      cancel_url: `${appUrl}/profile?stripe=subscription_cancel`,
      metadata: {
        supabase_user_id: user.id,
        selected_tier: tier,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          selected_tier: tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Ismeretlen hiba történt." },
      { status: 500 }
    );
  }
}