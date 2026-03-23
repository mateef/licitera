import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserFromBearerToken(req: NextRequest) {
  console.log("PORTAL ROUTE: getUserFromBearerToken start");

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    console.log("PORTAL ROUTE: missing bearer token");
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.log("PORTAL ROUTE: getUser failed", error?.message);
    return null;
  }

  console.log("PORTAL ROUTE: user ok", user.id);
  return user;
}

export async function POST(req: NextRequest) {
  try {
    console.log("PORTAL ROUTE: POST start");

    const user = await getUserFromBearerToken(req);

    if (!user) {
      console.log("PORTAL ROUTE: unauthorized");
      return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    console.log("PORTAL ROUTE: body parsed", body);

    const requestedReturnUrl =
      typeof body?.returnUrl === "string" ? body.returnUrl.trim() : "";

    console.log("PORTAL ROUTE: querying profile");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.log("PORTAL ROUTE: profile error", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stripeCustomerId = (profile as any)?.stripe_customer_id;
    console.log("PORTAL ROUTE: stripeCustomerId", stripeCustomerId);

    if (!stripeCustomerId) {
      console.log("PORTAL ROUTE: no stripe customer id");
      return NextResponse.json(
        { error: "Ehhez a felhasználóhoz még nincs Stripe ügyfél létrehozva." },
        { status: 400 }
      );
    }

    const fallbackReturnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing`;
    const returnUrl = requestedReturnUrl || fallbackReturnUrl;

    console.log("PORTAL ROUTE: creating billing portal session", {
      stripeCustomerId,
      returnUrl,
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    console.log("PORTAL ROUTE: session created", session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.log("PORTAL ROUTE: FATAL ERROR", error?.message, error);
    return NextResponse.json(
      { error: error?.message || "Nem sikerült megnyitni a Stripe ügyfélportált." },
      { status: 500 }
    );
  }
}