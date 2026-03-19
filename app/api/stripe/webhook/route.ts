import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Hiányzó Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature hiba: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      // 1) Subscription checkout kezelése
      if (session.mode === "subscription" && session.customer && session.subscription) {
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer.id;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const priceId = subscription.items.data[0]?.price?.id;

        const tier =
          priceId === process.env.STRIPE_STANDARD_PRICE_ID
            ? "standard"
            : priceId === process.env.STRIPE_PRO_PRICE_ID
            ? "pro"
            : "free";

        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_tier: tier,
            subscription_status: subscription.status,
            subscription_current_period_end:
              subscription.items?.data?.[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
                : null,
          })
          .eq("stripe_customer_id", customerId);
      }

      // 2) Balance topup checkout kezelése
      if (session.mode === "payment" && metadata.type === "balance_topup") {
        const userId = metadata.user_id;
        const amountHuf = Number(metadata.amount_huf ?? "0");

        if (!userId || !Number.isFinite(amountHuf) || amountHuf <= 0) {
          return NextResponse.json(
            { error: "Hibás balance topup metadata." },
            { status: 400 }
          );
        }

        const { data: balanceRow, error: balanceError } = await supabaseAdmin
          .from("billing_user_balances")
          .select("balance_amount")
          .eq("user_id", userId)
          .maybeSingle();

        if (balanceError) {
          return NextResponse.json(
            { error: balanceError.message },
            { status: 500 }
          );
        }

        const currentBalance = Number((balanceRow as any)?.balance_amount ?? 0);
        const newBalance = currentBalance + amountHuf;

        const { error: upsertBalanceError } = await supabaseAdmin
          .from("billing_user_balances")
          .upsert(
            {
              user_id: userId,
              balance_amount: newBalance,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (upsertBalanceError) {
          return NextResponse.json(
            { error: upsertBalanceError.message },
            { status: 500 }
          );
        }

        const { error: ledgerError } = await supabaseAdmin
          .from("billing_ledger")
          .insert({
            user_id: userId,
            entry_type: "balance_topup",
            amount: amountHuf,
            description: "Stripe egyenlegrendezés",
          });

        if (ledgerError) {
          return NextResponse.json(
            { error: ledgerError.message },
            { status: 500 }
          );
        }
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const priceId = subscription.items.data[0]?.price?.id;

      const tier =
        subscription.status === "canceled" || subscription.status === "incomplete_expired"
          ? "free"
          : priceId === process.env.STRIPE_STANDARD_PRICE_ID
          ? "standard"
          : priceId === process.env.STRIPE_PRO_PRICE_ID
          ? "pro"
          : "free";

      await supabaseAdmin
        .from("profiles")
        .update({
          stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
          subscription_tier: tier,
          subscription_status: subscription.status,
          subscription_current_period_end:
            subscription.items?.data?.[0]?.current_period_end
              ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
              : null,
        })
        .eq("stripe_customer_id", customerId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Webhook feldolgozási hiba." },
      { status: 500 }
    );
  }
}