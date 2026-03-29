import { createNotification } from "./createNotification";
import { sendPushToUser } from "./sendPushToUser";

type CreateAndSendNotificationParams = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  uniqueKey?: string | null;
  data?: Record<string, any>;
};

export async function createAndSendNotification({
  userId,
  type,
  title,
  message,
  link,
  entityType = null,
  entityId = null,
  uniqueKey = null,
  data,
}: CreateAndSendNotificationParams) {
  await createNotification({
    userId,
    type,
    title,
    message,
    link,
  });

  await sendPushToUser({
    userId,
    title,
    body: message,
    notificationType: type,
    entityType,
    entityId,
    uniqueKey,
    data: {
      ...(data ?? {}),
      link: link ?? null,
      type,
    },
  });
}