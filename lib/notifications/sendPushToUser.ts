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

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
    expoPushToken?: string;
  };
};

function normalizeToken(value: unknown) {
  const token = String(value ?? "").trim();
  if (!token) return "";
  if (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  ) {
    return token;
  }
  return "";
}

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
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLog) {
      return { skipped: true as const, reason: "already_sent" as const };
    }
  }

  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (pref && pref.push_enabled === false) {
    if (uniqueKey) {
      await supabase.from("notification_delivery_log").insert({
        user_id: userId,
        notification_type: notificationType,
        entity_type: entityType,
        entity_id: entityId,
        unique_key: uniqueKey,
        delivered: false,
        error_message: "Push disabled by user preference",
      });
    }

    return { skipped: true as const, reason: "push_disabled" as const };
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (tokensError) {
    throw new Error(tokensError.message);
  }

  const activeTokens = (tokens ?? [])
    .map((x: any) => normalizeToken(x?.expo_push_token))
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

    return { skipped: true as const, reason: "no_token" as const };
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
      "Accept-encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    for (const token of activeTokens) {
      await supabase.from("notification_delivery_log").insert({
        user_id: userId,
        notification_type: notificationType,
        entity_type: entityType,
        entity_id: entityId,
        unique_key: uniqueKey,
        push_token: token,
        delivered: false,
        error_message: JSON.stringify(result),
      });
    }

    throw new Error(
      result?.errors?.[0]?.message || "Expo push küldés sikertelen."
    );
  }

  const tickets: ExpoPushTicket[] = Array.isArray(result?.data) ? result.data : [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < activeTokens.length; i += 1) {
    const token = activeTokens[i];
    const ticket = tickets[i];

    const delivered = ticket?.status === "ok";
    const errorMessage =
      ticket?.status === "error"
        ? ticket?.message || ticket?.details?.error || JSON.stringify(ticket)
        : null;

    if (
      ticket?.status === "error" &&
      ticket?.details?.error === "DeviceNotRegistered"
    ) {
      invalidTokens.push(token);
    }

    await supabase.from("notification_delivery_log").insert({
      user_id: userId,
      notification_type: notificationType,
      entity_type: entityType,
      entity_id: entityId,
      unique_key: uniqueKey,
      push_token: token,
      delivered,
      error_message: errorMessage,
    });
  }

  if (invalidTokens.length > 0) {
    await supabase
      .from("push_tokens")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("expo_push_token", invalidTokens)
      .eq("user_id", userId);
  }

  return {
    success: true,
    sent: activeTokens.length,
    invalidated: invalidTokens.length,
    tickets,
  };
}