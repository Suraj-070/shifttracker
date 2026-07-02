"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Use a microtask to avoid synchronous setState in effect body
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

      // Now safely set state — we're in a microtask, not synchronous effect body
      setPermission(Notification.permission as PermissionState);

      try {
        const reg = await navigator.serviceWorker.ready;
        if (!mounted.current) return;
        const sub = await reg.pushManager.getSubscription();
        if (!mounted.current) return;
        setSubscription(sub);
        setIsSubscribed(!!sub);
      } catch {
        // service worker not ready — ignore
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
    if (!("serviceWorker" in navigator)) return false;

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      setSubscription(sub);
      setIsSubscribed(true);

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });

      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    setIsLoading(true);
    try {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}