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

    const body = await req.json().catch(() => ({}));
    const returnUrl = body?.returnUrl as string | undefined;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stripeCustomerId = (profile as any)?.stripe_customer_id;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "Ehhez a felhasználóhoz még nincs Stripe ügyfél létrehozva." },
        { status: 400 }
      );
    }

    const finalReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing`;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: finalReturnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Nem sikerült megnyitni a Stripe ügyfélportált." },
      { status: 500 }
    );
  }
}