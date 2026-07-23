import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  // Set VAPID details lazily — only when actually sending
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not set — skipping push notification");
    return { success: false, expired: false };
  }

  webpush.setVapidDetails("mailto:admin@shifttracker.app", publicKey, privateKey);

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, expired: true };
    }
    return { success: false, expired: false };
  }
}
