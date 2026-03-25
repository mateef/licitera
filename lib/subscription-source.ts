export type SubscriptionTier = "free" | "standard" | "pro";
export type SubscriptionSource = "free" | "stripe" | "app_store" | "play_store";

export function getTierFromRevenueCatProductId(productId: string | null | undefined): SubscriptionTier {
  if (!productId) return "free";

  const standardIds = [
    process.env.RC_APPLE_STANDARD_PRODUCT_ID,
    process.env.RC_GOOGLE_STANDARD_PRODUCT_ID,
  ].filter(Boolean);

  const proIds = [
    process.env.RC_APPLE_PRO_PRODUCT_ID,
    process.env.RC_GOOGLE_PRO_PRODUCT_ID,
  ].filter(Boolean);

  if (standardIds.includes(productId)) return "standard";
  if (proIds.includes(productId)) return "pro";

  return "free";
}

export function getSubscriptionSourceFromRevenueCatStore(
  store: string | null | undefined
): SubscriptionSource {
  if (store === "APP_STORE") return "app_store";
  if (store === "PLAY_STORE") return "play_store";
  return "free";
}