const CACHE_NAME = "vibes-pwa-v2"; 
const PRECACHE_URLS = [
  "/manifest.json",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
  "/logo_homepage.png",
  "/offline", 
];

// 1. INSTALL: Only cache static assets (not the homepage!)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (error) {
            console.error("SW: Failed to cache", url, error);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// 2. ACTHVATE: Clean up old caches
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

// 3. FETCH: Network First for pages, Cache First for assets
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Strategy A: Cache First (For assets in PRECACHE_URLS like logo, manifest, etc.)
  if (url.origin === self.location.origin && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Strategy B: Network First -> Fallback to /offline (For all HTML navigations)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // NETWORK FAILED? User is offline.
        const cache = await caches.open(CACHE_NAME);
        
        // Serve the specific Offline page, NOT the homepage
        const offlinePage = await cache.match("/offline"); 
        
        return offlinePage || Response.error();
      })
    );
  }
});