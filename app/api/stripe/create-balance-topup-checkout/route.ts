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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
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

    const balanceAmount = Number((balanceRow as any)?.balance_amount ?? 0);

    if (balanceAmount >= 0) {
      return NextResponse.json(
        { error: "Nincs rendezendő negatív egyenleg." },
        { status: 400 }
      );
    }

    const amountToPay = Math.abs(balanceAmount);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: (profile as any)?.email ?? user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: "Licitera egyenlegrendezés",
              description: "Negatív egyenleg rendezése a Licitera rendszerben",
            },
            unit_amount: amountToPay,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/billing?topup=success`,
      cancel_url: `${baseUrl}/billing?topup=cancel`,
      metadata: {
        type: "balance_topup",
        user_id: user.id,
        amount_huf: String(amountToPay),
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