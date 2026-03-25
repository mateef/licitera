import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mapEntitlementToTier(entitlements: string[] | undefined | null): "free" | "standard" | "pro" {
  const list = entitlements ?? [];

  if (list.includes("pro")) return "pro";
  if (list.includes("standard")) return "standard";
  return "free";
}

function mapStoreToSource(store: string | null | undefined): "free" | "app_store" | "play_store" {
  const normalized = (store ?? "").toLowerCase();

  if (normalized.includes("app_store")) return "app_store";
  if (normalized.includes("play_store")) return "play_store";
  return "free";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const expected = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;

    if (!expected || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const event = body?.event;

    if (!event) {
      return NextResponse.json({ error: "Missing event" }, { status: 400 });
    }

    const appUserId = event.app_user_id as string | undefined;
    if (!appUserId) {
      return NextResponse.json({ error: "Missing app_user_id" }, { status: 400 });
    }

    const entitlementIds = Array.isArray(event.entitlement_ids)
      ? event.entitlement_ids
      : [];

    const tier = mapEntitlementToTier(entitlementIds);

    const isActiveEvent = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "UNCANCELLATION",
      "PRODUCT_CHANGE",
      "TRANSFER",
      "NON_RENEWING_PURCHASE",
    ].includes(event.type);

    const isInactiveEvent = [
      "CANCELLATION",
      "EXPIRATION",
      "BILLING_ISSUE",
    ].includes(event.type);

    const source = tier === "free" ? "free" : mapStoreToSource(event.store);

    const nextStatus =
      tier === "free"
        ? isInactiveEvent
          ? "inactive"
          : "inactive"
        : isActiveEvent
        ? "active"
        : "active";

    const expirationAt =
      typeof event.expiration_at_ms === "number"
        ? new Date(event.expiration_at_ms).toISOString()
        : null;

    const productId =
      (event.product_id as string | undefined) ?? null;

    const payload =
      tier === "free"
        ? {
            subscription_tier: "free",
            subscription_status: "inactive",
            subscription_current_period_end: null,
            subscription_source: "free",
            subscription_store: null,
            subscription_store_product_id: null,
            revenuecat_app_user_id: appUserId,
          }
        : {
            subscription_tier: tier,
            subscription_status: nextStatus,
            subscription_current_period_end: expirationAt,
            subscription_source: source,
            subscription_store: event.store ?? null,
            subscription_store_product_id: productId,
            revenuecat_app_user_id: appUserId,
          };

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("id", appUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "RevenueCat webhook hiba." },
      { status: 500 }
    );
  }
}