const CACHE_NAME = "shifttracker-shell-v1";
const OFFLINE_URL = "/offline.html";

const SHELL_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache API calls — shift data must always be fresh, never stale-served.
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ error: "You're offline. Changes need an internet connection." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          )
      )
    );
    return;
  }

  // Only handle GET navigations/assets; let everything else pass through normally.
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache same-origin successful responses for the app shell.
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return Response.error();
      })
  );
});
