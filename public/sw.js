const CACHE_NAME = "cobradecision-static-v3";
const STATIC_ASSETS = [
  "/offline.html",
  "/app.css",
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

  // 1. Navigation requests: network first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // 2. Static assets only: stale-while-revalidate (exclude sw.js itself)
  const isStaticAsset =
    url.pathname !== "/sw.js" &&
    url.pathname.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|ico|webmanifest|webp|avif)$/);

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
    return;
  }

  // 3. All other requests (HTMX, API, dynamic JSON/HTML): bypass SW completely
});
