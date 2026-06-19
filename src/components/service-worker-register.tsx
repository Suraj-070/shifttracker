"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount. Renders nothing.
 * Kept as its own client component so layout.tsx can stay a server component.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/service-worker.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
