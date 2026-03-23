import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Hiányzó auth header." }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
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
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Érvénytelen felhasználó." }, { status: 401 });
    }

    const body = await req.json();
    const tier = body?.tier as "standard" | "pro";
    const successUrl = body?.successUrl as string | undefined;
    const cancelUrl = body?.cancelUrl as string | undefined;

    if (!tier || !["standard", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Érvénytelen csomag." }, { status: 400 });
    }

    const priceId =
      tier === "standard"
        ? process.env.STRIPE_STANDARD_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Hiányzik a Stripe price ID." }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id,email,full_name,stripe_customer_id,stripe_subscription_id,subscription_tier,subscription_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "A profil nem található." }, { status: 404 });
    }

    const currentTier = ((profile as any).subscription_tier ?? "free") as
      | "free"
      | "standard"
      | "pro";
    const currentSubscriptionId = (profile as any).stripe_subscription_id as string | null;

    const hasExistingPaidSubscription = currentTier !== "free" || !!currentSubscriptionId;

    if (hasExistingPaidSubscription) {
      return NextResponse.json(
        {
          error:
            "Már van aktív vagy létező előfizetésed. A csomagváltást az előfizetéskezelőben tudod intézni.",
        },
        { status: 400 }
      );
    }

    let stripeCustomerId = (profile as any).stripe_customer_id as string | null;

    if (stripeCustomerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(stripeCustomerId);

        if ((existingCustomer as any)?.deleted) {
          stripeCustomerId = null;
        }
      } catch {
        stripeCustomerId = null;
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (profile as any).email || user.email || undefined,
        name: (profile as any).full_name || undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: customerUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (customerUpdateError) {
        return NextResponse.json({ error: customerUpdateError.message }, { status: 500 });
      }
    }

    const defaultBaseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const finalSuccessUrl = successUrl || `${defaultBaseUrl}/billing?stripe=success`;
    const finalCancelUrl = cancelUrl || `${defaultBaseUrl}/billing?stripe=cancel`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: stripeCustomerId,
        billing_address_collection: "required",
        customer_update: {
          address: "auto",
          name: "auto",
        },
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          user_id: user.id,
          tier,
        },
      },
      {
        idempotencyKey: `subscription-checkout:${user.id}:${tier}`,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Nem sikerült létrehozni a checkout sessiont." },
      { status: 500 }
    );
  }
}