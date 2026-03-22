import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, amountHuf } = body as {
      userId?: string;
      amountHuf?: number;
    };

    if (!userId) {
      return NextResponse.json({ error: "Hiányzó userId." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.email) {
      return NextResponse.json(
        { error: "A felhasználóhoz nincs email cím." },
        { status: 400 }
      );
    }

    let finalAmountHuf = Number(amountHuf ?? 0);

    if (!finalAmountHuf || finalAmountHuf <= 0) {
      const { data: balanceRow, error: balanceError } = await supabaseAdmin
        .from("billing_user_balances")
        .select("balance_amount")
        .eq("user_id", userId)
        .maybeSingle();

      if (balanceError) {
        return NextResponse.json({ error: balanceError.message }, { status: 500 });
      }

      const balance = Number((balanceRow as any)?.balance_amount ?? 0);

      if (balance >= 0) {
        return NextResponse.json(
          { error: "Nincs rendezendő negatív egyenleg." },
          { status: 400 }
        );
      }

      finalAmountHuf = Math.abs(balance);
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: {
          user_id: userId,
        },
      });

      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      success_url: `${siteUrl}/billing?topup=success`,
      cancel_url: `${siteUrl}/billing?topup=cancel`,
      billing_address_collection: "required",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "huf",
            unit_amount: Math.round(finalAmountHuf * 100),
            product_data: {
              name: "Licitera egyenlegrendezés",
              description: "Negatív egyenleg rendezése",
            },
          },
        },
      ],
      metadata: {
        type: "balance_topup",
        user_id: userId,
        amount_huf: String(finalAmountHuf),
        source: "mobile_app",
        app_return_url: `${appUrl}/billing`,
      },
    });

    return NextResponse.json({
      url: session.url,
      amountHuf: finalAmountHuf,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Nem sikerült Stripe sessiont létrehozni." },
      { status: 500 }
    );
  }
}