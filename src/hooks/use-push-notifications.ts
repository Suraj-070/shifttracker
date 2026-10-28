"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

/** Convert a VAPID base64url key into the byte array required by PushManager. */
function urlBase64ToArrayBuffer(base64Url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }

  return bytes.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    Promise.resolve().then(async () => {
      if (!mounted.current) return;

      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setPermission("unsupported");
        return;
      }

      setPermission(Notification.permission as PermissionState);

      try {
        const reg = await navigator.serviceWorker.ready;
        if (!mounted.current) return;
        const sub = await reg.pushManager.getSubscription();
        if (!mounted.current) return;
        setSubscription(sub);
        setIsSubscribed(!!sub);
      } catch {
        // Keep the default state if service-worker subscription lookup fails.
      }
    });

    return () => {
      mounted.current = false;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return false;
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPermission("unsupported");
      return false;
    }

    setIsLoading(true);
    let createdSubscription: PushSubscription | null = null;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
      });
      if (!existing) createdSubscription = sub;

      const json = sub.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });

      if (!response.ok) {
        throw new Error(`Subscription registration failed (${response.status})`);
      }

      setSubscription(sub);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);

      // Do not leave a newly-created browser subscription behind when the
      // server could not save it; that would make the UI report a false success.
      if (createdSubscription) {
        try {
          await createdSubscription.unsubscribe();
        } catch {
          // The browser may already have removed it.
        }
      }
      setSubscription(null);
      setIsSubscribed(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    setIsLoading(true);

    try {
      const response = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      if (!response.ok) {
        throw new Error(`Subscription removal failed (${response.status})`);
      }

      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("Push unsubscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
