const STATIC_ASSET_RE = /\.(js|css|png|jpg|svg|ico|woff2?)$/;

/// Service Worker for better-auth-offline example app.
///
/// Caches the app shell (HTML pages and static assets) so the app loads offline.
/// API responses (/api/*) are NOT handled here — those are cached by the
/// better-auth-offline plugin in IndexedDB via the client-side fetch interceptor.

const CACHE_NAME = "app-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/dashboard"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip API requests — the offline plugin handles auth API caching via IndexedDB
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigation requests (HTML pages): network-first with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): cache-first with network fallback
  if (
    url.pathname.startsWith("/_next/") ||
    STATIC_ASSET_RE.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
    return;
  }
});
