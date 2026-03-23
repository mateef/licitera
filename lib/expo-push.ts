type ExpoPushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
};

export async function sendExpoPush(message: ExpoPushMessage) {
  const messages = Array.isArray(message.to)
    ? message.to.map((token) => ({
        to: token,
        sound: "default",
        title: message.title,
        body: message.body,
        data: message.data ?? {},
      }))
    : [
        {
          to: message.to,
          sound: "default",
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        },
      ];

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.message || "Expo push küldési hiba.");
  }

  return data;
}