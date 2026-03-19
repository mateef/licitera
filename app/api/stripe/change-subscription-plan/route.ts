import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromBearerToken(req);

    if (!user) {
      return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
    }

    const body = await req.json();
    const tier = body?.tier as "standard" | "pro";

    if (!tier || !["standard", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Érvénytelen csomag." }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id, subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stripeSubscriptionId = (profile as any)?.stripe_subscription_id;
    const currentTier = (profile as any)?.subscription_tier as "free" | "standard" | "pro" | null;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Nincs aktív Stripe előfizetés, ezért nem módosítható." },
        { status: 400 }
      );
    }

    if (!currentTier || currentTier === "free") {
      return NextResponse.json(
        { error: "Az ingyenes csomagról checkouton keresztül kell váltani." },
        { status: 400 }
      );
    }

    const targetPriceId =
      tier === "standard"
        ? process.env.STRIPE_STANDARD_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID;

    if (!targetPriceId) {
      return NextResponse.json({ error: "Hiányzik a cél Stripe price ID." }, { status: 500 });
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: "Nem található előfizetési tétel." },
        { status: 500 }
      );
    }

    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: targetPriceId,
        },
      ],
      proration_behavior: "always_invoice",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Nem sikerült módosítani az előfizetést." },
      { status: 500 }
    );
  }
}