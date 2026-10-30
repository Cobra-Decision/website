const CACHE_NAME = "cobradecision-static-v3";
const STATIC_ASSETS = [
  "/offline.html",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/vazirmatn.css",
  "/htmx.js",
  "/alpine.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET requests go directly to network
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // HTMX and dynamic routes must never be cached by service worker
  const isHtmx = request.headers.get("HX-Request") === "true";
  const isDynamic =
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/meets") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth");

  if (isHtmx || isDynamic) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Handle navigation requests: network first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Handle static assets only: stale-while-revalidate for faster response & auto-refresh
  const isStaticAsset = url.pathname.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|ico|webmanifest)$/);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
