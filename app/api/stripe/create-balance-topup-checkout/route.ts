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
    const successUrl = body?.successUrl as string | undefined;
    const cancelUrl = body?.cancelUrl as string | undefined;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data: balanceRow, error: balanceError } = await supabaseAdmin
      .from("billing_user_balances")
      .select("balance_amount")
      .eq("user_id", user.id)
      .maybeSingle();

    if (balanceError) {
      return NextResponse.json({ error: balanceError.message }, { status: 500 });
    }

    const rawBalance = Number((balanceRow as any)?.balance_amount ?? 0);

    if (!Number.isFinite(rawBalance)) {
      return NextResponse.json(
        { error: "Érvénytelen egyenleg érték az adatbázisban." },
        { status: 400 }
      );
    }

    if (rawBalance >= 0) {
      return NextResponse.json(
        { error: "Nincs rendezendő negatív egyenleg." },
        { status: 400 }
      );
    }

    const amountInHuf = Math.round(Math.abs(rawBalance));
    const stripeUnitAmount = amountInHuf * 100;

    if (amountInHuf < 175) {
      return NextResponse.json(
        {
          error: `A Stripe minimum összeg HUF esetén 175 Ft. A jelenlegi rendezendő összeg: ${amountInHuf} Ft.`,
        },
        { status: 400 }
      );
    }

    let stripeCustomerId = (profile as any)?.stripe_customer_id as string | null;

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
        email: (profile as any)?.email || user.email || undefined,
        name: (profile as any)?.full_name || undefined,
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
    const finalSuccessUrl = successUrl || `${defaultBaseUrl}/billing?topup=success`;
    const finalCancelUrl = cancelUrl || `${defaultBaseUrl}/billing?topup=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: "Licitera egyenlegrendezés",
              description: "Negatív egyenleg rendezése a Licitera rendszerben",
            },
            unit_amount: stripeUnitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        type: "balance_topup",
        user_id: user.id,
        amount_huf: String(amountInHuf),
        stripe_unit_amount: String(stripeUnitAmount),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("STRIPE BALANCE TOPUP ERROR:", error);
    console.error("STRIPE BALANCE TOPUP ERROR RAW:", error?.raw);
    console.error("STRIPE BALANCE TOPUP ERROR MESSAGE:", error?.message);

    return NextResponse.json(
      {
        error: error?.message ?? "Ismeretlen hiba történt.",
        details: error?.raw ?? null,
      },
      { status: 500 }
    );
  }
}