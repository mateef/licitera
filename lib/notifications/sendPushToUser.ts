import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SendPushToUserParams = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  notificationType: string;
  entityType?: string | null;
  entityId?: string | null;
  uniqueKey?: string | null;
};

export async function sendPushToUser({
  userId,
  title,
  body,
  data,
  notificationType,
  entityType = null,
  entityId = null,
  uniqueKey = null,
}: SendPushToUserParams) {
  if (uniqueKey) {
    const { data: existingLog } = await supabase
      .from("notification_delivery_log")
      .select("id")
      .eq("unique_key", uniqueKey)
      .maybeSingle();

    if (existingLog) {
      return { skipped: true, reason: "already_sent" as const };
    }
  }

  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (tokensError) {
    throw new Error(tokensError.message);
  }

  const activeTokens = (tokens ?? [])
    .map((x: any) => x.expo_push_token)
    .filter(Boolean);

  if (activeTokens.length === 0) {
    if (uniqueKey) {
      await supabase.from("notification_delivery_log").insert({
        user_id: userId,
        notification_type: notificationType,
        entity_type: entityType,
        entity_id: entityId,
        unique_key: uniqueKey,
        delivered: false,
        error_message: "No active push token",
      });
    }

    return { skipped: true, reason: "no_token" as const };
  }

  const messages = activeTokens.map((token: string) => ({
    to: token,
    sound: "default",
    title,
    body,
    data: data ?? {},
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json().catch(() => null);

  const ok = response.ok;

  for (const token of activeTokens) {
    await supabase.from("notification_delivery_log").insert({
      user_id: userId,
      notification_type: notificationType,
      entity_type: entityType,
      entity_id: entityId,
      unique_key: uniqueKey,
      push_token: token,
      delivered: ok,
      error_message: ok ? null : JSON.stringify(result),
    });
  }

  if (!ok) {
    throw new Error("Expo push küldés sikertelen.");
  }

  return { success: true };
}