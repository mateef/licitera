import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import {
  createSzamlazzHuInvoice,
  registerSzamlazzHuPayment,
} from "@/lib/szamlazzhu";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toHufAmount(stripeAmount: number | null | undefined) {
  if (!stripeAmount) return 0;
  return Math.round(Number(stripeAmount)) / 100;
}

function getTierFromPriceId(priceId: string | null | undefined): "free" | "standard" | "pro" {
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return "standard";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

function buildAddressLine(address: {
  line1?: string | null;
  line2?: string | null;
} | null | undefined) {
  const line1 = address?.line1?.trim() || "";
  const line2 = address?.line2?.trim() || "";

  if (line1 && line2) {
    return `${line1} ${line2}`;
  }

  return line1 || line2 || "";
}

async function hasExistingInvoice(stripeObjectId: string, invoiceType: string) {
  const { data, error } = await supabaseAdmin
    .from("billing_invoices")
    .select("id")
    .eq("stripe_object_id", stripeObjectId)
    .eq("invoice_type", invoiceType)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

async function saveInvoiceLog({
  userId,
  stripeEventId,
  stripeObjectId,
  invoiceType,
  amountHuf,
}: {
  userId: string;
  stripeEventId: string;
  stripeObjectId: string;
  invoiceType: string;
  amountHuf: number;
}) {
  const { error } = await supabaseAdmin.from("billing_invoices").insert({
    user_id: userId,
    stripe_event_id: stripeEventId,
    stripe_object_id: stripeObjectId,
    invoice_type: invoiceType,
    amount_huf: amountHuf,
    provider: "szamlazz_hu",
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function getProfileByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id, subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    id: string;
    email: string | null;
    full_name: string | null;
    stripe_customer_id: string | null;
    subscription_tier: "free" | "standard" | "pro" | null;
  } | null;
}

async function getProfileByCustomerId(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id, subscription_tier")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    id: string;
    email: string | null;
    full_name: string | null;
    stripe_customer_id: string | null;
    subscription_tier: "free" | "standard" | "pro" | null;
  } | null;
}

async function getStripeCustomer(customerId: string | null | undefined) {
  if (!customerId) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);

    if ((customer as any)?.deleted) {
      return null;
    }

    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

async function resolveInvoiceAddressData({
  session,
  invoice,
  customerId,
  fallbackName,
  fallbackEmail,
}: {
  session?: Stripe.Checkout.Session;
  invoice?: Stripe.Invoice;
  customerId?: string | null;
  fallbackName?: string | null;
  fallbackEmail?: string | null;
}) {
  const stripeCustomer = await getStripeCustomer(customerId ?? null);

  const sessionAddress = session?.customer_details?.address;
  const customerAddress = stripeCustomer?.address;
  const resolvedAddress = sessionAddress || customerAddress || null;

  const sessionName = session?.customer_details?.name || null;
  const invoiceName = invoice?.customer_name || null;
  const customerName = stripeCustomer?.name || null;

  const sessionEmail = session?.customer_details?.email || null;
  const invoiceEmail = invoice?.customer_email || null;
  const customerEmail = stripeCustomer?.email || null;

  const resolvedName =
    sessionName || invoiceName || customerName || fallbackName || "Licitera felhasználó";

  const resolvedEmail =
    sessionEmail || invoiceEmail || customerEmail || fallbackEmail || null;

  const postalCode = resolvedAddress?.postal_code?.trim() || "";
  const city = resolvedAddress?.city?.trim() || "";
  const addressLine = buildAddressLine(resolvedAddress);
  const country = resolvedAddress?.country?.trim() || "HU";

  if (!resolvedEmail) {
    throw new Error("Hiányzik a vevő email címe a számlázáshoz.");
  }

  if (!postalCode || !city || !addressLine) {
    throw new Error("Hiányzik a vevő számlázási címének valamely kötelező eleme a Stripe adatokból.");
  }

  return {
    name: resolvedName,
    email: resolvedEmail,
    postalCode,
    city,
    addressLine,
    country,
  };
}

async function syncSubscriptionProfileFromCheckout(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.customer || !session.subscription) {
    return;
  }

  const metadata = session.metadata || {};
  const userId = metadata.user_id;

  if (!userId) {
    throw new Error("Hiányzó user_id a subscription checkout metadata-ban.");
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer.id;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const tier = getTierFromPriceId(priceId);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_current_period_end:
        subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  console.log("SUBSCRIPTION PROFILE UPDATED FROM CHECKOUT", {
    userId,
    customerId,
    subscriptionId: subscription.id,
    tier,
    status: subscription.status,
  });
}

async function handleBalanceTopupCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripeEventId: string
) {

    
  const metadata = session.metadata || {};

  if (session.mode !== "payment" || metadata.type !== "balance_topup") {
    return;
  }

  console.log("BALANCE TOPUP WEBHOOK START", {
    sessionId: session.id,
    metadata,
    
  });

  

  const userId = metadata.user_id;
  const amountHuf = Number(metadata.amount_huf ?? "0");

  if (!userId || !Number.isFinite(amountHuf) || amountHuf <= 0) {
    throw new Error("Hibás balance topup metadata.");
  }

  const invoiceType = "balance_topup";
  const alreadyProcessed = await hasExistingInvoice(session.id, invoiceType);

  if (alreadyProcessed) {
    console.log("BALANCE TOPUP ALREADY PROCESSED", {
      sessionId: session.id,
      userId,
    });
    return;
  }

  const { error: ledgerError } = await supabaseAdmin.from("billing_ledger").insert({
    user_id: userId,
    entry_type: "balance_topup",
    amount: amountHuf,
    description: `Stripe egyenlegrendezés (${session.id})`,
  });

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  const profile = await getProfileByUserId(userId);

  if (!profile) {
    throw new Error("A felhasználó profilja nem található az egyenlegrendezés számlázásához.");
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || profile.stripe_customer_id;

  const buyer = await resolveInvoiceAddressData({
    session,
    customerId,
    fallbackName: profile.full_name,
    fallbackEmail: profile.email,
  });

console.log("BALANCE TOPUP INVOICE BUYER DEBUG", {
  userId,
  customerId,
  sessionCustomerEmail: session.customer_details?.email,
  profileEmail: profile.email,
  buyerName: buyer.name,
  buyerEmail: buyer.email,
  postalCode: buyer.postalCode,
  city: buyer.city,
  addressLine: buyer.addressLine,
  country: buyer.country,
});

  const invoiceResult = await createSzamlazzHuInvoice({
    name: buyer.name,
    email: buyer.email,
    amount: amountHuf,
    description: "Licitera egyenlegrendezés",
    postalCode: buyer.postalCode,
    city: buyer.city,
    addressLine: buyer.addressLine,
    country: buyer.country,
  });

  await registerSzamlazzHuPayment({
    invoiceNumber: invoiceResult.invoiceNumber,
    amount: amountHuf,
  });

  await saveInvoiceLog({
    userId,
    stripeEventId,
    stripeObjectId: session.id,
    invoiceType,
    amountHuf,
  });

  console.log("BALANCE TOPUP SUCCESS + INVOICE SENT + PAYMENT REGISTERED", {
    userId,
    sessionId: session.id,
    amountHuf,
    invoiceNumber: invoiceResult.invoiceNumber,
  });
}

function getPriceIdFromInvoiceLines(invoice: Stripe.Invoice): string | null {
  for (const line of invoice.lines.data) {
    const anyLine = line as any;
    const priceId = anyLine?.pricing?.price_details?.price || anyLine?.price?.id || null;

    if (priceId) {
      return priceId;
    }
  }

  return null;
}

async function handlePaidSubscriptionInvoice(invoice: Stripe.Invoice, stripeEventId: string) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

  if (!customerId) {
    throw new Error("Hiányzik a customer id az invoice.paid eseményből.");
  }

  const profile = await getProfileByCustomerId(customerId);

  if (!profile) {
    throw new Error("Nem található profil a Stripe customer alapján az invoice.paid eseménynél.");
  }

  const amountHuf = toHufAmount(invoice.amount_paid);

  if (!amountHuf || amountHuf <= 0) {
    console.log("SUBSCRIPTION INVOICE SKIPPED (ZERO OR NEGATIVE)", {
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid,
    });
    return;
  }

  let priceId = getPriceIdFromInvoiceLines(invoice);

  if (!priceId) {
    if (profile.subscription_tier === "standard") {
      priceId = process.env.STRIPE_STANDARD_PRICE_ID ?? null;
    } else if (profile.subscription_tier === "pro") {
      priceId = process.env.STRIPE_PRO_PRICE_ID ?? null;
    }
  }

  const tier = getTierFromPriceId(priceId);

  const invoiceType =
    tier === "pro"
      ? "subscription_pro"
      : tier === "standard"
      ? "subscription_standard"
      : "subscription_paid";

  const alreadyProcessed = await hasExistingInvoice(invoice.id, invoiceType);

  if (alreadyProcessed) {
    console.log("SUBSCRIPTION INVOICE ALREADY PROCESSED", {
      invoiceId: invoice.id,
      userId: profile.id,
      invoiceType,
    });
    return;
  }

  const description =
    tier === "pro"
      ? "Licitera Pro előfizetés"
      : tier === "standard"
      ? "Licitera Standard előfizetés"
      : "Licitera előfizetés";

  const buyer = await resolveInvoiceAddressData({
    invoice,
    customerId,
    fallbackName: profile.full_name,
    fallbackEmail: profile.email,
  });

  console.log("SUBSCRIPTION INVOICE BUYER DEBUG", {
  customerId,
  invoiceCustomerEmail: invoice.customer_email,
  profileEmail: profile.email,
  buyerName: buyer.name,
  buyerEmail: buyer.email,
});

  const invoiceResult = await createSzamlazzHuInvoice({
    name: buyer.name,
    email: buyer.email,
    amount: amountHuf,
    description,
    postalCode: buyer.postalCode,
    city: buyer.city,
    addressLine: buyer.addressLine,
    country: buyer.country,
  });

  await registerSzamlazzHuPayment({
    invoiceNumber: invoiceResult.invoiceNumber,
    amount: amountHuf,
  });

  await saveInvoiceLog({
    userId: profile.id,
    stripeEventId,
    stripeObjectId: invoice.id,
    invoiceType,
    amountHuf,
  });

  console.log("SUBSCRIPTION INVOICE SUCCESS + INVOICE SENT + PAYMENT REGISTERED", {
    userId: profile.id,
    invoiceId: invoice.id,
    invoiceType,
    amountHuf,
    invoiceNumber: invoiceResult.invoiceNumber,
  });
}

async function syncSubscriptionProfile(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const priceId = subscription.items.data[0]?.price?.id ?? null;

  const tier =
    subscription.status === "canceled" || subscription.status === "incomplete_expired"
      ? "free"
      : getTierFromPriceId(priceId);

  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_current_period_end:
        subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
    })
    .eq("stripe_customer_id", customerId);

  if (profileUpdateError) {
    throw new Error(profileUpdateError.message);
  }

  console.log("SUBSCRIPTION STATUS SYNCED", {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
  });
}

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
    console.log("STRIPE WEBHOOK EVENT:", event.type, event.id);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      await syncSubscriptionProfileFromCheckout(session);
      await handleBalanceTopupCheckoutCompleted(session, event.id);
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaidSubscriptionInvoice(invoice, event.id);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionProfile(subscription);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("STRIPE WEBHOOK ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook feldolgozási hiba." },
      { status: 500 }
    );
  }
}