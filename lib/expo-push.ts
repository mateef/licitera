type ExpoPushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
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

function normalizeTokens(to: string | string[]) {
  const raw = Array.isArray(to) ? to : [to];

  return raw
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .filter((x) => x.startsWith("ExponentPushToken[") || x.startsWith("ExpoPushToken["));
}

export async function sendExpoPush(message: ExpoPushMessage) {
  const tokens = normalizeTokens(message.to);

  if (tokens.length === 0) {
    return {
      ok: true,
      sent: 0,
      tickets: [] as ExpoPushTicket[],
      invalidTokens: [] as string[],
    };
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.message ||
        json?.message ||
        "Expo push küldési hiba."
    );
  }

  const tickets = Array.isArray(json?.data) ? (json.data as ExpoPushTicket[]) : [];
  const invalidTokens: string[] = [];

  tickets.forEach((ticket, index) => {
    if (
      ticket?.status === "error" &&
      ticket?.details?.error === "DeviceNotRegistered"
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  return {
    ok: true,
    sent: tokens.length,
    tickets,
    invalidTokens,
  };
}